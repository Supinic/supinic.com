module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "/data/slots-winner/list").json();

		const printData = data.sort((a, b) => b.odds - a.odds).map(i => ({
			Rank: `<a href="/data/slots-winner/detail/${i.ID}">${i.rank}</a>`,
			Odds: sb.Utils.round(i.odds, 3),
			User: i.userName,
			Channel: i.channelName,
			Date: new sb.Date(i.timestamp).format("Y-m-d H:i:s")
		}));

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 50,
			sortColumn: 0,
			sortDirection: "asc"
		});
	});

	Router.get("/detail/:id", async (req, res) => {
		const { data } = await sb.Got("Supinic", `/data/slots-winner/detail/${req.params.id}`).json();

		const printData = {
			Odds: sb.Utils.round(data.odds, 3),
			User: data.userName,
			Channel: data.channelName,
			Date: new sb.Date(data.timestamp).format("Y-m-d H:i:s"),
			Roll: sb.Utils.escapeHTML(data.result),
			Input: `<code>${sb.Utils.escapeHTML(data.source)}</code>`
		};

		res.render("generic-detail-table", { data: printData });
	});

	return Router;
})();
