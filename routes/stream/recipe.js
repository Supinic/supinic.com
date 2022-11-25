const Express = require("express");
const Router = Express.Router();

const Recipe = require("../../modules/stream/recipe.js");
const WebUtils = require("../../utils/webutils");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const response = await sb.Got("Supinic", "stream/recipe/list").json();
		const printData = response.body.data.map(recipe => ({
			Name: `<a href="/stream/recipe/detail/${encodeURIComponent(recipe.name)}">${recipe.name}</a>`,
			"Suggested by": recipe.suggestedBy ?? "N/A",
			"Streamed on": recipe.date ?? "(not yet)"
		}));

		res.render("generic-list-table", {
			title: "Recipes for Supi's streams",
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25,
			specificFiltering: true
		});
	});

	Router.get("/detail/:recipe", async (req, res) => {
		const response = await sb.Got("Supinic", `stream/recipe/detail/${encodeURIComponent(req.params.recipe)}`).json();
		if (response.statusCode !== 200) {
			return WebUtils.handleError(res, response.statusCode, response.body.error?.message);
		}

		const recipe = response.body.data;
		const printData = {
			Name: recipe.name,
			"Streamed on": recipe.date ?? "(not yet)",
			"Suggested by": recipe.suggestedBy,
			URL: (recipe.url)
				? recipe.url.split("\n").map(i => WebUtils.linkify(i)).join("<br>")
				: "N/A",
			Ingredients: recipe.url ?? "N/A",
			Procedure: recipe.procedure ?? "N/A",
			Notes: recipe.notes ?? "N/A"
		};

		res.render("generic-detail-table", {
			data: printData
		});
	});

	return Router;
})();
