module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const CustomCommandAlias = require("../../../modules/data/custom-command-alias.js");
	const UserAlias = require("../../../modules/chat-data/user-alias.js");

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

	Router.get("/alias/detail/:ID", async (req, res) => {
		const ID = Number(req.params.ID);
		if (!sb.Utils.isValidInteger(ID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed ID provided");
		}

		const aliasData = await CustomCommandAlias.selectSingleCustom(rs => rs
			.where("ID = %n", ID)
		);

		if (!aliasData) {
			return sb.WebUtils.apiFail(res, 404, "No such alias exists");
		}

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
			.where("User_Alias = %n", userData.ID)
			.where("Channel IS NULL")
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

		aliasData.Arguments = (aliasData.Arguments) ? JSON.parse(aliasData.Arguments) : [];

		return sb.WebUtils.apiSuccess(res, aliasData);
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
