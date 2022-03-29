const Express = require("express");
const Router = Express.Router();

const CustomCommandAlias = require("../../../modules/data/custom-command-alias.js");
const UserAlias = require("../../../modules/chat-data/user-alias.js");

module.exports = (function () {
	"use strict";

	const fetchUserData = async (res, type, id) => {
		const callback = (type === "user-name")
			? (q) => q.where("Name = %s", id)
			: (q) => q.where("ID = %n", Number(id));

		const userData = await UserAlias.selectSingleCustom(callback);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}
		else {
			return sb.WebUtils.apiSuccess(res, {
				ID: userData.ID,
				name: userData.Name
			});
		}
	};

	Router.get("/alias/link/:username/:alias", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const aliasOwnerData = await sb.User.get(req.params.username);
		if (!aliasOwnerData) {
			return sb.WebUtils.apiFail(res, 404, "Provided user does not exist");
		}

		const aliasData = await CustomCommandAlias.selectSingleCustom(q => q
			.where("User_Alias = %n", aliasOwnerData.ID)
			.where("Name COLLATE utf8mb4_bin = %s", req.params.alias)
		);

		if (!aliasData) {
			return sb.WebUtils.apiFail(res, 404, "Provided user does not own the provided alias");
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

		return sb.WebUtils.apiSuccess(res, response.body.data, {
			skipCaseConversion: true
		});
	});

	Router.get("/alias/detail/:id", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed ID provided");
		}

		const aliasData = await CustomCommandAlias.selectSingleCustom(rs => rs
			.where("ID = %n", ID)
		);

		if (!aliasData) {
			return sb.WebUtils.apiFail(res, 404, "No such alias exists");
		}

		const userData = await sb.User.get(aliasData.User_Alias);
		aliasData.User_Name = userData.Name;
		aliasData.Arguments = (aliasData.Arguments) ? JSON.parse(aliasData.Arguments) : [];

		return sb.WebUtils.apiSuccess(res, aliasData);
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

		const userData = await sb.User.get(name);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}

		const data = await CustomCommandAlias.fetchForUser(userData.ID, {
			includeArguments: Boolean(includeArguments)
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/user/:name/alias/list Detail of specific command alias
	 * @apiName GetUserCommandAliasDetail
	 * @apiDescription For a specified user and their alias, this endpoint lists its details
	 * @apiGroup Bot
	 * @apiPermission any
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
		const userData = await sb.User.get(name);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}

		const aliasData = await CustomCommandAlias.fetchForUser(userData.ID, {
			aliasIdentifier: alias,
			includeArguments: true
		});

		if (!aliasData) {
			return sb.WebUtils.apiFail(res, 404, "User has no such alias");
		}

		aliasData.User_Name = userData.Name;

		return sb.WebUtils.apiSuccess(res, aliasData);
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
		const userData = await sb.User.get(username);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}

		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		if (auth.userData.Name !== userData.Name) {
			return sb.WebUtils.apiFail(res, 403, "Cannot list another user's data");
		}

		const propertyList = await sb.Query.getRecordset(rs => rs
			.select("Custom_Data_Property.Name", "Custom_Data_Property.Type")
			.from("chat_data", "User_Alias_Data")
			.join({
				toTable: "Custom_Data_Property",
				on: "Custom_Data_Property.Name = User_Alias_Data.Property"
			})
			.where("User_Alias = %n", userData.ID)
		);

		const promises = propertyList.map(async (property) => {
			const value = await userData.getDataProperty(property.Name, { force: true });
			return {
				name: property.Name,
				value,
				type: property.Type
			};
		});

		const propertyData = await Promise.all(promises);
		return sb.WebUtils.apiSuccess(res, propertyData);
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
