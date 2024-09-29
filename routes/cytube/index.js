const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	Router.get("/video-request/history", async (req, res) => {
		const response = await sb.Got.get("Supinic")({
			url: "cytube/video-request/history"
		});
		const { data } = response.body;
		const printData = data.map(i => ({
			ID: i.ID,
			Link: `<a href="${i.fullLink}">${i.link}</a>`,
			"Requested by": i.username,
			Length: sb.Utils.formatTime(i.length, true),
			Posted: new sb.Date(i.posted).format("Y-m-d H:i:s")
		}));

		res.render("generic-list-table", {
			title: "Cytube video request history",
			data: printData,
			head: ["ID", "Link", "Requested by", "Length", "Posted"],
			pageLength: 50
		});
	});

	return Router;
})();
