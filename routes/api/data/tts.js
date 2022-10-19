const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/google/list", async (req, res) => {
		const data = sb.Config.get("TTS_LOCALE_DATA");
		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/streamelements/list", async (req, res) => {
		const data = sb.Config.get("TTS_VOICE_DATA");
		for (const record of data) {
			if (!record.gender) {
				record.gender = null;
			}
		}

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
