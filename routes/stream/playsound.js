const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const response = await sb.Got.get("Supinic")({
			url: "bot/playsound/list"
		});

		const data = response.body.data.map(i => ({
			Name: i.name,
			Cooldown: {
				dataOrder: i.cooldown,
				value: `${i.cooldown / 1000} seconds`
			},
			Sample: `<audio class="preview" style="width:100%" controls preload="none"><source src="/static/playsound/${i.filename}"></audio>`,
			Notes: (i.notes) ?? "N/A"
		}));

		res.render("generic-list-table", {
			data,
			head: Object.keys(data[0]),
			pageLength: 25,
			extraCSS: `audio.preview {
				height: 25px;
				min-width: 125px;
		    }`
		});
	});

	return Router;
})();
