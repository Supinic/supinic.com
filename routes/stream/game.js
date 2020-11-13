/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Game = require("../../modules/stream/game.js");

	Router.get("/detail/:game", async (req, res) => {
		const game = Game.selectSingleCustom(q => q
			.where("Name = %s", req.params.game)
		);

		if (!game) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "No game found"
			});
		}

		res.render("generic-detail-table", {
			data: game
		});
	});

	Router.get("/list", async (req, res) => {
		const games = await Game.selectAll();

		const printData = games.map(game => ({
			Name: `<a href="/stream/game/detail/${game.Name}">${game.Name}</a>`,
			Status: game.Status,
			Released: {
				dataOrder: (game.Released) ? new sb.Date(game.Released).valueOf() : 0,
				value: (game.Released) ? new sb.Date(game.Released).format("Y") : "N/A"
			}
		}));

		res.render("generic-list-table", {
			title: "Supi's stream games",
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25,
			specificFiltering: true
		});
	});

	return Router;
})();
