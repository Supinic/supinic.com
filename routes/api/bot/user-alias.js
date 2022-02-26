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
			.where("Name = %s", req.params.alias)
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

	Router.get("/:name/alias/list", async (req, res) => {
		const { name } = req.params;
		const userData = await sb.User.get(name);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}

		const data = await CustomCommandAlias.selectMultipleCustom(rs => rs
			.select("ParentAuthor.Name AS Link_Author", "ParentAlias.Name AS Link_Name")
			.from("data", "Custom_Command_Alias")
			.where("Custom_Command_Alias.User_Alias = %n", userData.ID)
			.where("Custom_Command_Alias.Channel IS NULL")
			.leftJoin({
				alias: "ParentAlias",
				toDatabase: "data",
				toTable: "Custom_Command_Alias",
				on: "Custom_Command_Alias.Parent = ParentAlias.ID AND Custom_Command_Alias.Invocation IS NULL"
			})
			.leftJoin({
				alias: "ParentAuthor",
				toDatabase: "chat_data",
				toTable: "User_Alias",
				on: "ParentAlias.User_Alias = ParentAuthor.ID"
			})
		);

		for (const item of data) {
			item.Arguments = (item.Arguments) ? JSON.parse(item.Arguments) : [];
		}

		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/:name/alias/detail/:alias", async (req, res) => {
		const { name, alias } = req.params;
		const userData = await sb.User.get(name);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}

		const aliasData = await CustomCommandAlias.selectSingleCustom(rs => rs
			.where("User_Alias = %n", userData.ID)
			.where("Name = %s", alias)
			.where("Channel IS NULL")
		);

		if (!aliasData) {
			return sb.WebUtils.apiFail(res, 404, "User has no such alias");
		}

		aliasData.User_Name = userData.Name;
		aliasData.Arguments = (aliasData.Arguments) ? JSON.parse(aliasData.Arguments) : [];

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
	 * @apiSuccess {string|number|boolean|Object|Array|null} properties.value
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
