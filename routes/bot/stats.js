/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const cachePrefix = "web/routes/bot/stats";
	const stringMap = {
		channels: {
			active: "Channels Supibot is active in"
		},
		users: {
			active: "Active users in all channels Supibot is in",
			total: "Total users Supibot encountered so far"
		},
		chatlines: {
			size: "Size the chat line logs take up",
			total: "Total amount of saved chat lines"
		},
		commands: {
			active: "Amount of commands used since last restart"
		},
		afk: {
			active: "Amount of currently AFK users",
			total: "Total amount of AFK statuses set overall"
		},
		reminders: {
			active: "Currently pending reminders",
			total: "Total amount of reminders set overall"
		},
		filters: {
			active: "Amount of bans from Supibot commands, and other filters"
		}
	};

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
			for (const [subKey, subValue] of Object.entries(topValue)) {
				const resultKey = stringMap[topKey][subKey];

				if (topKey === "chatlines" && subKey === "size") {
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
