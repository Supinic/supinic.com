const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");
const Recipe = require("../../../modules/stream/recipe.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const data = await Recipe.selectCustom(rs => rs
			.select("Name", "Suggested_By")
			.select("Stream.Date")
			.leftJoin({
				fromTable: "Stream_Recipe",
				fromField: "Recipe",
				toTable: "Recipe",
				toField: "Name",
				on: "Recipe.Name = Stream_Recipe.Recipe"
			})
			.leftJoin("stream", "Stream")
		);

		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/detail/:recipe", async (req, res) => {
		if (!req.params.recipe) {
			return sb.WebUtils.apiFail(res, 400, "No recipe identifier provided");
		}
		
		const data = await Recipe.selectSingleCustom(rs => rs
			.select("Stream.Date")
			.leftJoin({
				fromTable: "Stream_Recipe",
				fromField: "Recipe",
				toTable: "Recipe",
				toField: "Name",
				on: "Recipe.Name = Stream_Recipe.Recipe"
			})
			.leftJoin("stream", "Stream")
			.where("Custom_Command_Alias.Name COLLATE utf8mb4_bin = %s", req.params.recipe)
		);
		
		if (!data) {
			return sb.WebUtils.apiFail(res, 404, "No recipe found");
		}

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
