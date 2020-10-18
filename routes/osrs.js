module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/activity/list", async (req, res) => {
		const { data: rawData } = await sb.Got.instances.Supinic("/osrs/activity/list").json();
		const printData = rawData.map(row => {
			const { afk, hourly } = row.data;
			const hourlyExperience = Math.round(Object.values(hourly.out.experience)[0]);
			const gpxp = sb.Utils.round((hourly.in.price ?? 0 - hourly.out.price ?? 0) / hourlyExperience, 2);

			return {
				Name: i.name,
				"XP/hr": hourlyExperience,
				"GP/XP": gpxp,
				"Capital/hr": (hourly.in.price ?? 0),
				"AFK %": sb.Utils.round(afk.true / (afk.true + afk.false), 2) + "%"
			}
		});

		return res.render("generic-list-table", {
			title: "OSRS - Activity list",
			data: printData,
			head: ["Name", "XP/hr", "GP/XP", "Capital/hr", "AFK %"],
			pageLength: 10
		});
	});

	return Router;
})();
