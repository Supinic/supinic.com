/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../modules/chat-data/channel.js");
	const Throughput = require("../../modules/messages.js");

	Router.get("/list", async (req, res) => {
		const { data: rawData } = await sb.Got.instances.Supinic("bot/channel/list").json();

		// Use all non-Discord channels, and only show Discord channels with a description
		// Those who aren't are most likely inactive.
		const data = rawData.filter(i => i.platformName !== "Discord" || i.description).map(i => ({
			Name: (i.platformName === "Discord")
				? (i.description || "(unnamed discord channel)")
				: i.name,
			Mode: i.mode,
			Platform: i.platformName,
			LineCount: {
				dataOrder: i.lineCount,
				value: String(i.lineCount).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
			},
			ByteLength: {
				dataOrder: i.byteLength,
				value: (i.byteLength >= 1e9)
					? (sb.Utils.round(i.byteLength / 1e9, 3) + " GB")
					: (i.byteLength >= 1e6)
						? (sb.Utils.round(i.byteLength / 1e6, 3) + " MB")
						: (sb.Utils.round(i.byteLength / 1e3, 0) + " kB")
			},
			ID: `<a href="/bot/channel/${i.ID}">${i.ID}</a>`
		}));

		res.render("generic-list-table", {
			title: "Channel list - Supibot",
			data: data,
			head: Object.keys(data[0]),
			pageLength: 50,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	Router.get("/:id", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Target channel has no activity data"
			});
		}

		const channelData = await Channel.selectSingleCustom(q => q
			.select("Platform.Name AS Platform_Name")
			.select("Platform.Message_Limit AS Platform_Message_Limit")
			.join("chat_data", "Platform")
			.where("Channel.ID = %n", channelID)
		);
		if (!channelData) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Target channel has no activity data"
			});
		}

		const data = {
			ID: channelData.ID,
			Name: channelData.Name,
			Platform: channelData.Platform_Name,
			"Platform ID": channelData.Specific_ID,
			"Bot mode": channelData.Mode,
			"Banphrase API": channelData.Banphrase_API_URL ?? "N/A",
			"Message limit": channelData.Message_Limit ?? channelData.Platform_Message_Limit,
			Description: channelData.Description ?? "N/A",
			Activity: `<a href="/bot/channel/${channelData.ID}/activity">Activity charts</a>`,
			Filters: `<a href="/bot/channel/${channelData.ID}/filter/list">List of filters</a>`,
		};

		res.render("generic-detail-table", {
			title: `Detail - Channel ${channelData.ID} - Supibot`,
			data
		});
	});

	Router.get("/:id/activity", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Target channel has no activity data"
			});
		}

		const channelRow = await Channel.getRow(channelID);
		if (!channelRow) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Target channel has no activity data"
			});
		}

		const channelData = channelRow.valuesObject;
		if (typeof sb.App.cache.channelActivity === "undefined") {
			sb.App.cache.channelActivity = {};
		}

		const [lastHourData, lastDayData, lastMonthData] = await Promise.all([
			Throughput.lastHour(channelData.ID),
			Throughput.lastDay(channelData.ID),
			(async () => sb.App.cache.channelActivity[channelID] ?? await Throughput.lastMonth(channelData.ID))()
		]);

		if (typeof sb.App.cache.channelActivity[channelID] === "undefined") {
			sb.App.cache.channelActivity[channelID] = lastMonthData;
		}

		let minuteData = [];
		let hourData = [];
		let dayLabels = [];
		let dayData = [];

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
			title: `Activity - Channel ${channelData.ID} - Supibot`,
			minuteData: JSON.stringify(minuteData),
			hourData: JSON.stringify(hourData),
			dayData: JSON.stringify(dayData),
			dayLabels: JSON.stringify(dayLabels),
			channelName: channelData.Name
		});
	});

	Router.get("/:id/filter/list", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Target channel has no filter data"
			});
		}

		const { data } = await sb.Got.instances.Supinic(`/bot/filter/channel/${channelID}/list`).json();
		const printData = data.map(i => ({
			ID: i.ID,
			User: i.userName ?? "(all)",
			Command: i.commandName ?? "(all)",
			Created: new sb.Date(i.created).format("Y-m-d H:i"),
			Reason: i.reason ?? "N/A"
		}));

		res.render("generic-list-table", {
			title: `Filters - Channel ${channelData.ID} - Supibot`,
			data: printData,
			head: ["ID", "User", "Command", "Created", "Reason"],
			pageLength: 10
		});
	});

	return Router;
})();
	