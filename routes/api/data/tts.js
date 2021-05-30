module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/google/list", async (req, res) => {
		const data = sb.Config.get("TTS_LOCALE_DATA");
		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/streamelements/list", async (req, res) => {
		const data = sb.Config.get("TTS_VOICE_DATA");
		for (const record of data) {
			if (!record.gender) {
				record.gender = null;
			}
		}

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
