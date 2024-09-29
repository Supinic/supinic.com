const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const response = await sb.Got.get("Supinic")({
			url: "data/faq/list"
		});
		const { data } = response.body;
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
		const response = await sb.Got.get("Supinic")({
			url: `data/faq/detail/${req.params.id}`
		});

		if (!response.ok) {
			return WebUtils.handleError(res, response.statusCode, response.body.error?.message);
		}

		const { data } = response.body;
		const printData = {
			"Entry ID": data.ID,
			Question: data.question,
			Answer: data.answer
		};

		res.render("generic-detail-table", { data: printData });
	});

	return Router;
})();
