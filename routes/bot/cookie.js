/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = JSON.parse(await sb.Utils.request("https://supinic.com/api/bot/cookie/list"));
		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 100
		});
	});

	return Router;
})();
