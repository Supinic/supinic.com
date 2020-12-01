/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const cachePrefix = "web/routes/bot/stats";

	Router.get("/", async (req, res) => {
		let data = await sb.Cache.getByPrefix(cachePrefix);
		if (!data) {
			data = await sb.Got("Supinic", "bot/stats").json();
			await sb.Cache.setByPrefix(cachePrefix, data, {
				expiry: 600_000
			});
		}

		const printData = {};
		for (const [topKey, topValue] of Object.entries(data)) {
			const prettyKey = topKey.split(/(?=[A-Z])/).join(" ").toLowerCase();
			for (const [subKey, subValue] of Object.entries(topValue)) {
				const prettySubKey = sb.Utils.capitalize(subKey);
				printData[`${prettySubKey} ${prettyKey}`] = subValue;
			}
		}

		res.render("generic-detail-table", {
			data: printData
		});
	});

	return Router;
})();
