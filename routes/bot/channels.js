/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Throughput = require("../../modules/messages.js");
	const Channel = require("../../modules/channel.js");

	Router.get("/", async (req, res) => {	
		const rawData = await Channel.list();
		let data = rawData.map(i => ({
			ID: i.ID,
			Link: `${i.Name}-${i.ID}`,
			Name: (i.PlatformName === "Discord")
				? (i.Description || "(unnamed discord channel)")
				: i.Name,
			Mode: i.Mode,
			Platform: i.PlatformName,
			LineCount: String(i.LineCount).replace(/\B(?=(\d{3})+(?!\d))/g, " "),
			LineCountNumber: i.LineCount,
			ByteLength: (i.ByteLength >= 1e9)
				? (sb.Utils.round(i.ByteLength / 1e9, 3) + " GB")
				: (i.ByteLength >= 1e6)
					? (sb.Utils.round(i.ByteLength / 1e6, 3) + " MB")
					: (sb.Utils.round(i.ByteLength / 1e3, 0) + " kB"),
			ByteLengthNumber: i.ByteLength
		}));

		res.render("channels-list", {
			data: data
		});
	});

	Router.get("/:name-:id/activity", async (req, res) => {
		const tableList = await Throughput.getList();
		const channelID = Number(req.params.id);
		const channelName = String(req.params.name).toLowerCase();

		const channelData = tableList.find(i => i.ID === channelID && i.Name === channelName);
		if (!channelData) {
			res.status(404).render("error", {
				error: "404",
				message: "Target channel has no activity data"
			});
			return;
		}

		console.time("Activity SQL");
		const [lastHourData, lastDayData, lastMonthData] = await Promise.all([
			Throughput.lastHour(channelData.ID),
			Throughput.lastDay(channelData.ID),
			Throughput.lastMonth(channelData.ID)
		]);
		console.timeEnd("Activity SQL");

		let minuteData = [];
		let hourData = [];
		let dayData = [];
		let dayLabels = [];

		for (const row of lastHourData) {
			minuteData.push(Number(row.Amount));
		}

		for (const row of lastDayData) {
			hourData.push(Number(row.Amount));
		}

		for (const row of lastMonthData) {
			dayLabels.push(new sb.Date(row.Timestamp).format("D j.n.Y"));
			dayData.push(Number(row.Amount));
		}

		res.render("channel-activity", {
			minuteData: JSON.stringify(minuteData),
			hourData: JSON.stringify(hourData),
			dayData: JSON.stringify(dayData),
			dayLabels: JSON.stringify(dayLabels),
			channelName: channelName
		});
	});

	return Router;
})();
	