const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/auth", async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		return WebUtils.apiSuccess(res, {
			message: "Your authorization succeeded",
			user: {
				ID: auth.userID,
				level: auth.level
			}
		});
	});

	Router.get("/timeout", async () => {
		// Don't actually respond at all
	});

	return Router;
})();
