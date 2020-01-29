/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const ExtraUserData = require("../../modules/chat-data/extra-user-data.js");

	Router.get("/", async (req, res) => {
		sb.InternalRequest.pending.queue = new sb.Promise();
		sb.InternalRequest.send(new sb.URLParams().set("type", "queue"));
		const { current, queue } = await sb.InternalRequest.pending.queue;
		sb.InternalRequest.pending.queue = null;

		const data = [];
		if (current) {
			for (const record of queue) {
				let status = "";
				if (record.vlcID === current.vlcID) {
					status = "Playing";
				}
				else if (record.vlcID > current.vlcID) {
					status = "Pending";
				}
				else {
					status = "Played";
				}

				data.push({
					ID: record.vlcID,
					Link: `<a href="${record.link}">${record.name}</a>`,
					Length: record.length,
					Status: status,
					"Requested by": (await sb.User.get(record.user)).Name,
					"Requested on": new sb.Date(record.requested).format("Y-m-d H:i")
				})
			}

			res.render("generic-list-table", {
				data: data,
				head: Object.keys(data[0]),
				pageLength: 25
			});
		}
		else {
			res.render("error", {
				message: "Song requests are off",
				error: "Nothing is currently playing because the song requests module is turned off."
			});
		}
	});

	return Router;
})();
