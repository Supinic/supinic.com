module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/video-request/history", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("cytube/video-request/history").json();
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
			head: Object.keys(printData[0]),
			pageLength: 50
		});
	});

	return Router;
})();