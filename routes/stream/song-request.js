const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const print = (data, ...extraFields) => data.map(track => {
		const obj = {
			Order: track.order,
			Username: track.username ?? "(auto-requested)",
			Media: (track.url.includes("/home"))
				? `${sb.Utils.escapeHTML(track.name ?? track.url)}`
				: `<a target="_blank" href="${track.url}">${sb.Utils.escapeHTML(track.name)}</a>`
		};

		if (extraFields.includes("ID")) {
			obj.ID = track.ID;
		}
		if (extraFields.includes("Added")) {
			obj.Added = new sb.Date(track.added).format("Y-m-d H:i");
		}

		return obj;
	});

	Router.get("/queue", async (req, res) => {
		const header = ["Order", "Username", "Media"];
		const response = await sb.Got.get("Supinic")({
			url: "bot/song-request/queue"
		});

		const { data } = response.body;
		res.render("generic-list-table", {
			title: "Current song request queue at Supinic",
			data: print(data, "ID", "Status"),
			head: header,
			pageLength: 10
		});
	});

	Router.get("/history", async (req, res) => {
		const header = ["ID", "Username", "Media", "Added"];
		const response = await sb.Got.get("Supinic")({
			url: "bot/song-request/history"
		});

		const { data } = response.body;
		res.render("generic-list-table", {
			title: "History of song requests at Supinic",
			data: await print(data, "Added", "ID"),
			head: header,
			pageLength: 25,
			sortColumn: 4,
			sortDirection: "desc"
		});
	});

	return Router;
})();
