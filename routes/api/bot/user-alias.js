const Express = require("express");
const Router = Express.Router();

const CustomCommandAlias = require("../../../modules/data/custom-command-alias.js");
const User = require("../../../modules/chat-data/user-alias.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const fetchUserData = async (res, type, identifier) => {
		let userData;
		if (type === "user-name") {
			userData = await User.selectSingleCustom(q => q.where("Name = %s", identifier));
		}
		else {
			const id = Number(identifier);
			if (!sb.Utils.isValidInteger(id)) {
				return WebUtils.apiFail(res, 400, "Malformed numeric ID provided");
			}

			userData = await User.selectSingleCustom(q => q.where("ID = %n", id));
		}

		if (!userData) {
			return WebUtils.apiFail(res, 404, "User not found");
		}
		else {
			return WebUtils.apiSuccess(res, {
				ID: userData.ID,
				name: userData.Name
			});
		}
	};

	Router.get("/alias/link/:username/:alias", async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const aliasOwnerData = await User.getByName(req.params.username);
		if (!aliasOwnerData) {
			return WebUtils.apiFail(res, 404, "Provided user does not exist");
		}

		const aliasData = await CustomCommandAlias.selectSingleCustom(q => q
			.where("User_Alias = %n", aliasOwnerData.ID)
			.where("Name COLLATE utf8mb4_bin = %s", req.params.alias)
		);

		if (!aliasData) {
			return WebUtils.apiFail(res, 404, "Provided user does not own the provided alias");
		}

		const response = await sb.Got("Supibot", {
			url: "command/execute",
			searchParams: {
				invocation: "alias",
				platform: "twitch",
				channel: null,
				user: auth.userData.Name,
				arguments: `link ${aliasOwnerData.Name} ${aliasData.Name}`
			}
		});

		return WebUtils.apiSuccess(res, response.body.data, {
			skipCaseConversion: true
		});
	});

	Router.get("/alias/detail/:id", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return WebUtils.apiFail(res, 400, "Malformed ID provided");
		}

		const aliasData = await CustomCommandAlias.selectSingleCustom(rs => rs
			.where("ID = %n", ID)
		);

		if (!aliasData) {
			return WebUtils.apiFail(res, 404, "No such alias exists");
		}

		const userData = await User.getByID(aliasData.User_Alias);
		aliasData.User_Name = userData.Name;
		aliasData.Arguments = (aliasData.Arguments) ? JSON.parse(aliasData.Arguments) : [];

		return WebUtils.apiSuccess(res, aliasData);
	});

	/**
	 * @api {get} /bot/user/:name/alias/list List custom command aliases
	 * @apiName GetUserCommandAliases
	 * @apiDescription For a specified user, this endpoint lists all their custom command aliases.
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {string} includeArguments If any value is passed, the alias `arguments` body will be returned also.
	 * @apiSuccess {Object[]} alias
	 * @apiSuccess {string} alias.name
	 * @apiSuccess {string} alias.invocation Main command of the custom alias
	 * @apiSuccess {string} alias.created ISO date string
	 * @apiSuccess {string} alias.edited ISO date string
	 * @apiSuccess {string} alias.description
	 * @apiSuccess {string} alias.linkAuthor If the alias is a link to another, this is its author name
	 * @apiSuccess {string} alias.linkName If the alias is a link to another, this is the linked alias name
	 * @apiSuccess {string[]} [alias.arguments] Body of the alias as a string array. Will be omitted unless `includeArguments` is provided.
	 * @apiError (404) NotFound User was not found
	 */
	Router.get("/:name/alias/list", async (req, res) => {
		const { name } = req.params;
		const { includeArguments } = req.query;

		const userData = await User.getByName(name);
		if (!userData) {
			return WebUtils.apiFail(res, 404, "User not found");
		}

		const data = await CustomCommandAlias.fetchListForUser(userData.ID, {
			includeArguments: Boolean(includeArguments)
		});

		return WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/user/:name/alias/detail/:alias Detail of specific command alias
	 * @apiName GetUserCommandAliasDetail
	 * @apiDescription For a specified user and their alias, this endpoint lists its details
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {number|string|boolean} [includeChildAliasData] if any value is provided, additional data will be provided about links/copies
	 * @apiSuccess {string} name
	 * @apiSuccess {string} invocation Main command of the custom alias
	 * @apiSuccess {string} created ISO date string
	 * @apiSuccess {string} edited ISO date string
	 * @apiSuccess {string} description
	 * @apiSuccess {string} linkAuthor If the alias is a link to another, this is its author name
	 * @apiSuccess {string} linkName If the alias is a link to another, this is the linked alias name
	 * @apiSuccess {string} userName Owner of the alias = identical to :name
	 * @apiSuccess {string[]} alias.arguments Body of the alias
	 * @apiError (404) NotFound User was not found
	 */
	Router.get("/:name/alias/detail/:alias", async (req, res) => {
		const { name, alias } = req.params;
		const userData = await User.getByName(name);
		if (!userData) {
			return WebUtils.apiFail(res, 404, "User not found");
		}

		const aliasData = await CustomCommandAlias.fetchDetailForUser(userData.ID, alias, {
			includeArguments: true,
			includeChildAliasData: Boolean(req.query.includeChildAliasData)
		});

		if (!aliasData) {
			return WebUtils.apiFail(res, 404, "User has no such alias");
		}

		aliasData.User_Name = userData.Name;

		return WebUtils.apiSuccess(res, aliasData);
	});

	/**
	 * @api {get} /bot/user/:username/data/list List custom data for current user
	 * @apiName GetCustomUserData
	 * @apiDescription For a specified logged in user (ONLY the authenticated one), lists all their custom data.
	 * @apiGroup Bot
	 * @apiPermission login, self-only
	 * @apiSuccess {Object[]} properties
	 * @apiSuccess {string} properties.name
	 * @apiSuccess {any} properties.value
	 * @apiSuccess {string} properties.type
	 * @apiError (403) Forbidden Not logged in; or checking a non-self user
	 * @apiError (404) NotFound User was not found
	 */
	Router.get("/:username/data/list", async (req, res) => {
		const { username } = req.params;
		const userData = await User.getByName(username);
		if (!userData) {
			return WebUtils.apiFail(res, 404, "User not found");
		}

		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		if (auth.userData.Name !== userData.Name) {
			return WebUtils.apiFail(res, 403, "Cannot list another user's data");
		}

		const propertyList = await sb.Query.getRecordset(rs => rs
			.select("Property", "Value")
			.select("Custom_Data_Property.Type")
			.from("chat_data", "User_Alias_Data")
			.join({
				toTable: "Custom_Data_Property",
				on: "Custom_Data_Property.Name = User_Alias_Data.Property"
			})
			.where("User_Alias = %n", userData.ID)
		);

		const propertyData = propertyList.map(i => {
			let value = i.Value;
			if (i.Type === "object" || i.Type === "array") {
				try {
					value = JSON.parse(value);
				}
				catch {
					value = null;
				}
			}

			return {
				name: i.Property,
				value,
				type: i.Type
			}
		});

		return WebUtils.apiSuccess(res, propertyData, {
			skipCaseConversion: true
		});
	});

	/**
	 * @api {get} /bot/user/resolve/name/:name Fetch user by username
	 * @apiName FetchUserByUsername
	 * @apiDescription Fetches user identifiers, based on username
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} name
	 * @apiError (404) NotFound User was not found
	 **/
	Router.get("/resolve/name/:name", async (req, res) => await fetchUserData(res, "user-name", req.params.name));

	/**
	 * @api {get} /bot/user/resolve/ID/:id Fetch user by ID
	 * @apiName FetchUserByID
	 * @apiDescription Fetches user identifiers, based on ID
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} name
	 * @apiError (404) NotFound User was not found
	 **/
	Router.get("/resolve/ID/:id", async (req, res) => await fetchUserData(res, "user-id", req.params.id));

	return Router;
})();
