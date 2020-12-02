/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "bot/cookie/list").json();
		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 100
		});
	});

	return Router;
})();
