const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const stringMap = {
		channels: {
			active: "Channels Supibot is active in",
			metaSize: "Size of channel-related meta-data"
		},
		users: {
			active: "Active users in all channels Supibot is in",
			total: "Total users Supibot encountered so far",
			size: "Size of all users and their custom data",
			metaSize: "Size of user-related meta-data (e.g. \"Last seen\")"
		},
		chatlines: {
			size: "Size the chat line logs take up",
			total: "Total amount of saved chat lines"
		},
		commands: {
			active: "Currently available commands",
			countSinceRestart: "Commands excuted since last bot restart",
			countTotal: "All ever executed commands (since 2019-02-28)"
		},
		afk: {
			active: "Amount of currently AFK users",
			total: "Total amount of AFK statuses set overall",
			size: "Size of the AFK status table"
		},
		reminders: {
			active: "Currently pending reminders",
			total: "Total amount of reminders set overall",
			size: "Size of the reminder table"
		},
		filters: {
			active: "Amount of filters (optouts, blocks, whitelists, bans)"
		}
	};

	Router.get("/", async (req, res) => {
		const printData = {};
		const { data } = await sb.Got("Supinic", "bot/stats").json();

		for (const [topKey, topValue] of Object.entries(data)) {
			for (const [subKey, subValue] of Object.entries(topValue)) {
				const resultKey = stringMap[topKey]?.[subKey] ?? null;
				if (!resultKey) {
					continue;
				}

				if (subKey === "size" || subKey === "metaSize") {
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
