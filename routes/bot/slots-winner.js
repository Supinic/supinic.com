/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data: rawData } = await sb.Got.instances.Supinic("/data/slots-winner/list").json();

		const data = rawData.sort((a, b) => b.timestamp - a.timestamp).map(i => ({
			"Odds - 1:X" : sb.Utils.round(i.odds, 3),
			User: i.userName,
			Channel: i.channelName,
			Roll: [
				`<div title="Input: ${i.source.replace(/"/g, `&ldquo;`)}" style="cursor: pointer; text-decoration: underline;">List of words</div>`,
				`<div title="Winning roll: ${i.result.replace(/"/g, `&ldquo;`)}" style="cursor: pointer; text-decoration: underline;">Winning roll</div>`
			].join(""),
			Date: new sb.Date(i.timestamp).format("Y-m-d H:i:s")
		}));

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "desc"
		});
	});

	return Router;
})();
