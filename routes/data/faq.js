const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "data/faq/list").json();
		const renderData = data.map(i => ({
			Question: i.question,
			Answer: i.answer,
			Detail: `<a href="/data/faq/detail/${i.ID}">#</a>`,
			searchables: (i.tags.length > 0) ? i.tags.join(";") : ""
		}));

		res.render("generic-list-table", {
			data: renderData,
			head: ["Question", "Answer", "Detail"],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	Router.get("/detail/:id", async (req, res) => {
		const response = await sb.Got("Supinic", `data/faq/detail/${id}`).json();
		if (!response.ok) {
			return WebUtils.handleError(res, response.statusCode, response.body.error?.message);
		}

		const printData = {
			"Entry ID": response.data.ID,
			Question: response.data.question,
			Answer: response.data.answer,
		};

		res.render("generic-detail-table", { data: printData });
	});

	return Router;
})();
