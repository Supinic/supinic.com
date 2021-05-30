module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Config = require("../../../modules/data/config.js");

	Router.get("/enabled", async (req, res) => {
		const status = await Config.selectSingleCustom(q => q
			.where("Name = %s", "TTS_ENABLED")
		);

		res.type("application/json")
			.status(200)
			.send(JSON.stringify({
				statusCode: 200,
				data: {
					enabled: Boolean(Number(status.Value))
				}
			}));
	});

	return Router;
})();
