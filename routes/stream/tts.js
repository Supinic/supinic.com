/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("data/tts/voices/list").json();
		const renderData = data.map(i => ({
			Name: i.name,
			Language: i.lang,
			Gender: i.gender ?? "N/A"
		}));

		res.render("generic-list-table", {
			data: renderData,
			head: Object.keys(renderData[0]),
			pageLength: 50,
			specificFiltering: true
		});
	});

	return Router;
})();
