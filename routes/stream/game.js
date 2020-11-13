/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Game = require("../../modules/stream/game.js");

	Router.get("/detail/:game", async (req, res) => {
		const identifier = req.params.game.replace(/_/g, " ");
		const gameData = await Game.selectSingleCustom(q => q
			.where("Name = %s", identifier)
		);

		if (!gameData) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "No game found"
			});
		}

		const printData = {};
		for (const [rawKey, value] of Object.entries(gameData)) {
			const key = sb.Utils.capitalize(rawKey.replace(/_/g, " "));

			if (key === "Released") {
				printData[key] = (value === null)
					? "N/A"
					: new sb.Date(value).format("Y-m-d");
			}
			else if (key === "Notes") {
				printData[key] = (value === null)
					? "N/A"
					: value
			}
			else {
				printData[key] = value;
			}
		}

		const [comments, streams] = await Promise.all([
			Game.getComments(gameData.Name),
			Game.getStreams(gameData.Name)
		]);

		const commentRows = comments.map(i => `<tr><td>${i.Created}</td><td>${i.Username}</td><td>${i.Text}</td></tr>`);
		printData.Comments = sb.Utils.tag.trim `
			<table id="comments">
				<thead>
					<th>Date</th>
					<th>Username</th>
					<th>Text</th>
				</thead>
				<tbody>
					${commentRows}
				</tbody>
			</table>		
		`;

		const streamsRows = streams.map(i => {
			const date = new sb.Date(i.Date).format("Y-m-d");
			const link = `<a href="//twitch.tv/videos/${i.Stream_ID}?t=${i.Timestamp}s">${i.Stream_ID}</a>`;
			return `<tr><td>${date}</td><td>${link}</td><td>${i.Notes}</td></tr>`;
		});
		printData.Streams = sb.Utils.tag.trim `
			<table id="streams">
				<thead>
					<th id="date">Date</th>
					<th id="video-id">VOD</th>
					<th id="notes">Notes</th>
				</thead>
				<tbody>
					${streamsRows}
				</tbody>
			</table>		
		`;

		res.render("generic-detail-table", {
			extraCSS: `table#streams th#video-id { min-width: 70px }`,
			data: printData
		});
	});

	Router.get("/list", async (req, res) => {
		const games = await Game.selectAll();

		const printData = games.map(game => ({
			Name: `<a href="/stream/game/detail/${game.Name.replace(/\s+/g, "_")}">${game.Name}</a>`,
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
