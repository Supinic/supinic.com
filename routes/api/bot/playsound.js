module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Config = require("../../../modules/data/config.js");
	const Playsound = require("../../../modules/data/playsound.js");

	Router.get("/enabled", async (req, res) => {
		const status = await Config.selectSingleCustom(q => q
			.where("Name = %s", "PLAYSOUNDS_ENABLED")
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

	Router.get("/list", async (req, res) => {
		const [playsounds, command] = await Promise.all([
			Playsound.selectAll(),
			Playsound.getCommand()
		]);

		const data = {
			playsounds: playsounds.map(i => ({
				name: i.Name,
				cooldown: i.Cooldown
			})),
			commandCooldown: command.Cooldown
		};

		res.type("application/json")
			.status(200)
			.send(JSON.stringify({
				statusCode: 200,
				data: data
			}));
	});

	return Router;
})();