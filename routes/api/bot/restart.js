const Express = require("express");
const Router = Express.Router();

const promisify = require("util").promisify;
const exec = promisify(require("child_process").exec);

const config = require("../../../restart-user-list.json");
const WebUtils = require("../../../utils/webutils.js");

// @supinic @leppunen @heryin @boring_nick @mm2pl
const ALLOWED_USERS = config.users;

module.exports = (function () {
	"use strict";

	Router.post("/", async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		if (!ALLOWED_USERS.includes(auth.userData.ID)) {
			return WebUtils.apiFail(res, 401, "You have no access to this endpoint");
		}

		await exec("pm2 restart supibot");

		return WebUtils.apiSuccess(res, { result: "OK" });
	});

	return Router;
})();
