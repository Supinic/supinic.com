module.exports = (function () {
	"use strict";
	
	const Throughput = require("../modules/messages.js");
	const Express = require("express");
	const Router = Express.Router();

	Router.get("/:table", async (req, res) => {
		const tableList = await Throughput.getList();
		const table = req.params.table;

		if (!tableList.has(table)) {
			res.render("404", {
				data: "Target channel does not exist"
			});
			return;
		}

		const lastHourData = await Throughput.lastHour(req.params.table);
		const lastDayData = await Throughput.lastDay(req.params.table);
		let minuteData = [];
		let hourData = [];

		for (const row of lastHourData) {
			for (const column in row) {
				if (column === table) {
					minuteData.push(Number(row[column]));
				}
			}
		}

		for (const row of lastDayData) {
			for (const column in row) {
				if (column === table) {
					hourData.push(Number(row[column]));
				}
			}
		}

		res.render("message-throughput", {
			minuteData: JSON.stringify(minuteData),
			hourData: JSON.stringify(hourData),
		});
	});

	return Router;
})();
	