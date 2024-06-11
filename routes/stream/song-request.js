const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const print = async (data, ...extraFields) => data.map(track => {
		const startTime = (track.startTime)
			? sb.Utils.formatTime(track.startTime, true)
			: "0:00";
		const endTime = (track.endTime)
			? sb.Utils.formatTime(track.endTime, true)
			: sb.Utils.formatTime(Number(track.length), true);

		const obj = {
			User: track.username,
			Name: `<a target="_blank" href="${track.parsedLink}">${sb.Utils.escapeHTML(track.name)}</a>`,
			Segment: {
				dataOrder: (track.startTime || track.endTime)
					? ((track.endTime ?? track.duration) - (track.startTime ?? 0))
					: 0,
				value: (track.startTime || track.endTime)
					? `${startTime} - ${endTime}`
					: "(full song)"
			},
			Duration: {
				dataOrder: Number(track.duration),
				value: sb.Utils.formatTime(Number(track.duration), true)
			}
		};

		if (extraFields.includes("ID")) {
			obj.ID = track.vlcID;
		}
		if (extraFields.includes("Status")) {
			obj.Status = track.status;
		}
		if (extraFields.includes("Added")) {
			obj.Added = new sb.Date(track.added).format("Y-m-d H:i");
		}

		return obj;
	});

	Router.get("/queue", async (req, res) => {
		const header = ["ID", "User", "Name", "Duration", "Segment", "Status"];
		const { data } = await sb.Got("Supinic", "bot/song-request/queue").json();

		res.render("generic-list-table", {
			title: "Current song request queue at Supinic",
			data: await print(data, "ID", "Status"),
			head: header,
			pageLength: 10
		});
	});

	Router.get("/history", async (req, res) => {
		const header = ["User", "Name", "Duration", "Segment", "Added"];
		const { data } = await sb.Got("Supinic", "bot/song-request/history").json();

		res.render("generic-list-table", {
			title: "History of song requests at Supinic",
			data: await print(data, "Added"),
			head: header,
			pageLength: 25,
			sortColumn: 4,
			sortDirection: "desc"
		});
	});

	return Router;
})();
