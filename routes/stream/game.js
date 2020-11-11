/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Game = require("../../modules/stream/game.js");

	Router.get("/list", async (req, res) => {
		const games = await Game.selectAll();

		const printData = games.map(game => ({
			Name: game.Name,
			Status: game.Status,
			Released: {
				dataOrder: (game.Released) ? new sb.Date(game.Released).valueOf() : 0,
				value: (game.Released) ? new sb.Date(game.Released).format("Y-m-d") : "N/A"
			},
			Notes: game.Notes ?? "N/A"
		}));

		res.render("generic-list-table", {
			title: "Supi's stream games",
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 50
		});
	});

	return Router;
})();
