const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const response = await sb.Got("Supinic", "stream/recipe/list");
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
		const response = await sb.Got("Supinic", `stream/recipe/detail/${encodeURIComponent(req.params.recipe)}`);
		if (response.statusCode !== 200) {
			return WebUtils.handleError(res, response.statusCode, response.body.error?.message);
		}

		const recipe = response.body.data;
		const timestamp = (recipe.timestamp) ? `?t=${recipe.timestamp}s` : "";

		let ingredientsString = "N/A";
		if (recipe.ingredients) {
			const list = recipe.ingredients.split(/\r?\n/).map(i => `<li>${i}</li>`).join("");
			ingredientsString = `<ul>${list}</ul>`;
		}

		let procedureString = "N/A";
		if (recipe.procedure) {
			const list = recipe.procedure.split(/\r?\n/).map(i => `<li>${i}</li>`).join("");
			procedureString = `<ol>${list}</ol>`;
		}

		const printData = {
			Name: recipe.name,
			"Streamed on": (recipe.date)
				? `<a href="//twitch.tv/videos/${recipe.videoID}${timestamp}">${recipe.date}</a>`
				: "(not yet)",
			"Suggested by": recipe.suggestedBy,
			URL: (recipe.url)
				? recipe.url.split("\n").map(i => WebUtils.linkify(i)).join("<br>")
				: "N/A",
			Ingredients: ingredientsString,
			Procedure: procedureString,
			Notes: (recipe.notes) ? WebUtils.linkify(recipe.notes) : "N/A",
			Preview: (recipe.preview)
				? `<img id="recipe-preview" src="${recipe.preview}"></img>`
				: "N/A"
		};

		res.render("generic-detail-table", {
			data: printData,
			extraCSS: `
				img#recipe-preview {
					max-width: 640px;
					max-height: 480px;
				}
			`
		});
	});

	return Router;
})();
