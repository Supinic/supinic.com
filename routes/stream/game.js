const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const normalize = (name) => {
		const slug = (name ?? "")
			.toLowerCase()
			.replaceAll(/['’]/g, "")
			.replaceAll(/[^a-z0-9]+/g, "_")
			.replaceAll(/^_+|_+$/g, "")
			.slice(0, 80)
			.replaceAll(/_+$/g, "");

		return slug || null;
	};

	Router.get("/list", async (req, res) => {
		const response = await sb.Got.get("Supinic")({
			url: `stream/game/list`
		});

		const games = response.body.data;
		const printData = games.map(game => ({
			Name: `<a href="/stream/game/detail/${game.ID}">${game.name}</a>`,
			Status: game.status,
			Genre: (game.genres && game.genres.length !== 0)
				? game.genres.join(" ")
				: "N/A",
			Steam: (game.steamId)
				? `<a href="//store.steampowered.com/app/${game.steamId}">🔗</a>`
				: "N/A",
			"Game time": {
				dataOrder: game.completionTime ?? 0,
				value: (game.completionTime)
					? `${game.completionTime} hours`
					: "N/A"
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

	Router.get("/detail/:game", async (req, res) => {
		const game = normalize(req.params.game);
		if (!game) {
			return res.status(400).render("error", {
				error: "400 Bad Request",
				message: "Invalid game identifier provided"
			});
		}

		const response = await sb.Got.get("Supinic")({
			url: `stream/game/detail/${game}`
		});
		if (!response.ok) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "No game found"
			});
		}

		const data = response.body.data;
		const printData = {
			Name: data.name,
			Released: (data.released) ? new sb.Date(data.released).format("Y-m-d") : "N/A",
			Genres: data.genres,
			Status: data.status,
			Steam: (data.steamId) ? `<a href="https://store.steampowered.com/app/${data.steamId}">Steam link</a>` : "N/A",
			Notes: data.notes ?? "N/A"
		};

		const streamsRows = data.streams.map(i => {
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
			extraCSS: sb.Utils.tag.trim `
				table#streams th#video-id { min-width: 70px; }
				table#streams th#date { min-width: 70px; }
			`,
			data: printData
		});
	});

	return Router;
})();
