/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const cachePrefix = "web/routes/bot/stats";

	Router.get("/", async (req, res) => {
		let data = await sb.Cache.getByPrefix(cachePrefix);
		if (!data) {
			const apiData = await sb.Got("Supinic", "bot/stats").json();

			data = apiData.data;
			await sb.Cache.setByPrefix(cachePrefix, data, {
				expiry: 600_000
			});
		}

		const printData = {};
		for (const [topKey, topValue] of Object.entries(data)) {
			const prettyKey = sb.Utils.capitailze(topKey.split(/(?=[A-Z])/).join(" "));
			for (const [subKey, subValue] of Object.entries(topValue)) {
				const prettySubKey = subKey.toLowerCase();
				const resultKey = `${prettyKey} - ${prettySubKey}`;

				if (topKey === "chatLines" && subKey === "size") {
					printData[resultKey] = sb.Utils.formatByteSize(subValue);
				}
				else {
					printData[resultKey] = sb.Utils.groupDigits(subValue);
				}
			}
		}

		res.render("generic-detail-table", {
			data: printData
		});
	});

	return Router;
})();
