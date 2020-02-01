module.exports = (function () {
	"use strict";
	
	const Origin = require("../modules/origin.js");
	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => {
		const data = (await Origin.list()).map(i => ({
			Emote: i.Emote,
			Text: i.Text
		}));

		res.render("generic-list-table", {
			data,
			head: Object.keys(data[0]),
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc"
		});
	});

	return Router;
})();