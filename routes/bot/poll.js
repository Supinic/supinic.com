const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "bot/poll/list").json();
		const printData = data.map(i => ({
			ID: i.ID,
			Text: i.text,
			"✔": i.votes.results.yes ?? "-",
			"❌": i.votes.results.no ?? "-",
			Start: new sb.Date(i.started).format("Y-m-d"),
			End: new sb.Date(i.ended).format("Y-m-d")
		}));

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25,
			extraCSS: `
				th[aria-label^="Start"], th[aria-label^="End"] {
					min-width: 45px;
				}
			`
		});
	});

	return Router;
})();
