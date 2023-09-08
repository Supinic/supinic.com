const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		res.render("generic-ajax-list-table", {
			head: ["User", "Attempts", "Traps", "Fish", "Junk", "Coins", "Total fish", "Total junk", "Total coins"],
			url: "https://supinic.com/api/bot/fish/list/client",
			sortDirection: "desc",
			sortColumn: 1,
			pageLength: 50
		});
	});

	return Router;
})();
