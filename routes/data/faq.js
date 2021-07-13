module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "/data/faq/list").json();
		const renderData = data.map(i => ({
			Question: i.question,
			Answer: i.answer
		}));

		res.render("generic-list-table", {
			data: renderData,
			head: Object.keys(renderData[0]),
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	return Router;
})();
