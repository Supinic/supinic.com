module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

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

	Router.get("/:name/alias/list", async (req, res) => {
		const { name } = req.params;
		const row = await UserAlias.selectSingleCustom(q => q.where("Name = %s", name));
		if (!row) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}

		const data = JSON.parse(row.Data ?? "{}");
		if (!data.aliasedCommands) {
			return sb.WebUtils.apiSuccess(res, { aliases: [] });
		}
		else {
			const aliases = Object.entries(data.aliasedCommands).map(([name, def]) => ({
				name,
				invocation: [def.invocation, ...def.args],
				created: def.created,
				lastEdit: def.lastEdit
			}));

			return sb.WebUtils.apiSuccess(res, { aliases });
		}
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
	Router.get("/resolve/name/:name", async (req, res) => {
		return await fetchUserData(res, "user-name", req.params.name);
	});

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
	Router.get("/resolve/ID/:id", async (req, res) => {
		return await fetchUserData(res, "user-id", req.params.id);
	});

	return Router;
})();