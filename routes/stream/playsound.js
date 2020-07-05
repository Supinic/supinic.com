/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data: { playsounds } } = await sb.Got.instances.Supinic("bot/playsound/list").json();

		const data = playsounds.map(i => ({
			Name: i.name,
			Cooldown: {
				dataOrder: i.cooldown,
				value: (i.cooldown / 1000) + " seconds"
			},
			Notes: (i.notes)
				? i.notes.replace(/\r?\n/g, "<br>")
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
