/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Playsound = require("../../modules/playsound.js");

	Router.get("/", async (req, res) => {
		const data = (await Playsound.getAll())
			.filter(i => i.Access !== "System")
			.map(i => ({
				Name: i.Name,
				Cooldown: (i.Cooldown / 1000) + " seconds",
				Notes: (i.Notes)
					? i.Notes.replace(/\r?\n/g, "<br>")
					: "N/A"
			}));

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 100
		});
	});

	return Router;
})();
