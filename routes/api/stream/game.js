const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");
const Game = require("../../../modules/stream/game.js");
const StreamGame = require("../../../modules/stream/stream-game.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const data = await Game.selectMultipleCustom(q => q.where("Status <> %s", "Hidden"));
		return WebUtils.apiSuccess(res, data, { skipCaseConversion: true });
	});

	Router.get("/detail/:game", async (req, res) => {
		const { game } = req.params;
		const data = await Game.selectSingleCustom(q => q.where("Identifier = %s", game));
		if (!data) {
			return WebUtils.apiFail(res, 404, "Provided ID does not exist");
		}

		const streams = await StreamGame.getForGame(data.name); // getForGame must receive name, not identifier!
		return WebUtils.apiSuccess(res, { ...data, streams }, { skipCaseConversion: true });
	});

	return Router;
})();
