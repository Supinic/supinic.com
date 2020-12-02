module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "/data/origin/list").json();
		const renderData = data.map(i => ({
			Emote: i.name,
			Text: i.text
		}));

		res.render("generic-list-table", {
			data: renderData,
			head: Object.keys(renderData[0]),
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc"
		});
	});

	return Router;
})();