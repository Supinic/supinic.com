const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");
const Recipe = require("../../../modules/stream/recipe.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const data = await Recipe.selectCustom(rs => rs
			.select("Name", "Suggested_By")
			.select("DATE_FORMAT(Stream.Date, '%Y-%m-%d') AS Date")
			.leftJoin({
				toDatabase: "stream",
				toTable: "Stream_Recipe",
				on: "Recipe.Name = Stream_Recipe.Recipe"
			})
			.leftJoin({
				toDatabase: "stream",
				toTable: "Stream",
				on: "Stream_Recipe.Stream = Stream.Video_ID"
			})
		);

		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/detail/:recipe", async (req, res) => {
		if (!req.params.recipe) {
			return WebUtils.apiFail(res, 400, "No recipe identifier provided");
		}

		const data = await Recipe.selectSingleCustom(rs => rs
			.select("DATE_FORMAT(Stream.Date, '%Y-%m-%d') AS Date")
			.select("Stream.Video_ID AS Video_ID")
			.select("Stream_Recipe.Preview AS Preview")
			.select("Stream_Recipe.Timestamp AS Timestamp")
			.leftJoin({
				toDatabase: "stream",
				toTable: "Stream_Recipe",
				on: "Recipe.Name = Stream_Recipe.Recipe"
			})
			.leftJoin({
				toDatabase: "stream",
				toTable: "Stream",
				on: "Stream_Recipe.Stream = Stream.Video_ID"
			})
			.where("Recipe.Name COLLATE utf8mb4_bin = %s", req.params.recipe)
		);

		if (!data) {
			return WebUtils.apiFail(res, 404, "No recipe found");
		}

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
