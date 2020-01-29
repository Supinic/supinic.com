module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Config = require("../../../modules/data/config.js");

	Router.get("/state", async (req, res) => {
		const state = await Config.selectSingleCustom(q => q
			.where("Name = %s", "SONG_REQUESTS_STATE")
		);

		res.type("application/json")
			.status(200)
			.send(JSON.stringify({
				statusCode: 200,
				data: {
					state: state.Value
				}
			}));
	});

	return Router;
})();