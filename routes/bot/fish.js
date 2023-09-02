const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	Router.get("/list/current", async (req, res) => {
		res.render("generic-ajax-list-table", {
			head: ["User", "Fish", "Junk", "Coins"],
			url: "https://supinic.com/api/bot/fish/list/current/client",
			sortDirection: "desc",
			sortColumn: 1,
			pageLength: 50
		});
	});

	Router.get("/list/total", async (req, res) => {
		res.render("generic-ajax-list-table", {
			head: ["User", "Attempts", "Fish", "Junk", "Coins"],
			url: "https://supinic.com/api/bot/fish/list/total/client",
			sortDirection: "desc",
			sortColumn: 1,
			pageLength: 50
		});
	});

	return Router;
})();
