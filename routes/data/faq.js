module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "data/faq/list").json();
		const renderData = data.map(i => ({
			Question: i.question,
			Answer: i.answer,
			searchables: (i.tags.length > 0) ? i.tags.join(";") : ""
		}));

		res.render("generic-list-table", {
			data: renderData,
			head: ["Question", "Answer"],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	return Router;
})();
