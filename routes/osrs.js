module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/activity/list", async (req, res) => {
		const { data: rawData } = await sb.Got("Supinic", "/osrs/activity/list").json();
		const printData = rawData.map(row => {
			const { afk, hourly } = row.data;
			const hourlyExperience = sb.Utils.round(Object.values(hourly.out.experience)[0], 0);
			const gpxp = sb.Utils.round(((hourly.out.price ?? 0) - (hourly.in.price ?? 0)) / hourlyExperience, 2);
			const afkPercent = sb.Utils.round(afk.true / (afk.true + afk.false) * 100, 0);

			return {
				Name: row.name,
				"XP/hr": {
					dataOrder: hourlyExperience,
					value: sb.Utils.groupDigits(hourlyExperience)
				},
				"GP/XP": {
					dataOrder: gpxp,
					value: gpxp.toFixed(2)
				},
				"Capital/hr": {
					dataOrder: (hourly.in.price ?? 0),
					value: sb.Utils.groupDigits((hourly.in.price ?? 0))
				},
				"AFK %": `${afkPercent}%`
			};
		});

		return res.render("generic-list-table", {
			title: "OSRS - Activity list",
			data: printData,
			head: ["Name", "XP/hr", "GP/XP", "Capital/hr", "AFK %"],
			pageLength: 10
		});
	});

	Router.get("/toa/calculator", async (req, res) => {
		res.render("toa-calculator");
	});

	return Router;
})();
