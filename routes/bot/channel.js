module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../modules/chat-data/channel.js");
	const Throughput = require("../../modules/messages.js");

	Router.get("/list", async (req, res) => {
		const { data: rawData } = await sb.Got("Supinic", "bot/channel/list").json();

		// Use all non-Discord channels, and only show Discord channels with a description
		// Those who aren't are most likely inactive.
		const data = rawData.filter(i => i.platformName !== "Discord" || i.description).map(i => ({
			Name: (i.platformName === "Discord")
				? (i.description ?? "(unnamed discord channel)")
				: i.name,
			Mode: i.mode,
			Platform: i.platformName,
			LineCount: {
				dataOrder: i.lineCount ?? 0,
				value: (i.lineCount)
					? sb.Utils.groupDigits(i.lineCount)
					: "N/A"
			},
			ByteLength: {
				dataOrder: i.byteLength ?? 0,
				value: (i.byteLength)
					? sb.Utils.formatByteSize(i.byteLength)
					: "N/A"
			},
			ID: `<a href="/bot/channel/${i.ID}">${i.ID}</a>`
		}));

		res.render("generic-list-table", {
			title: "Channel list - Supibot",
			data,
			head: Object.keys(data[0]),
			pageLength: 50,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	Router.get("/:id", async (req, res) => {
		res.redirect(`/bot/channel/detail/${req.params.id}`);
	});

	Router.get("/detail/:id", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "400 Bad Request",
				message: "Channel ID is not valid"
			});
		}

		const { data } = await sb.Got("Supinic", `bot/channel/detail/${channelID}`).json();

		const ambassadorsBody = data.ambassadorList.map(i => `<li>${i.name}</li>`).join("");
		const ambassadorsHTML = (data.ambassadorList.length === 0)
			? `No ambassadors`
			: `<ul>${ambassadorsBody}</ul>`;

		const renderData = {
			ID: data.ID,
			Name: data.name,
			Platform: data.platform,
			"Platform ID": data.platformID,
			"Bot mode": data.botMode,
			"Banphrase API URL": data.banphraseURL ?? "N/A",
			Description: data.description ?? "N/A",
			Ambassadors: ambassadorsHTML,
			Activity: `<a href="/bot/channel/detail/${data.ID}/activity">Activity charts</a>`,
			Filters: `<a href="/bot/channel/detail/${data.ID}/filter/list">List of filters</a>`
		};

		res.render("generic-detail-table", {
			title: `Detail - Channel ${data.ID} - Supibot`,
			data: renderData
		});
	});

	Router.get("/detail/:id/activity", async (req, res) => {
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
		const [lastDayData, lastMonthData] = await Promise.all([
			Throughput.lastDay(channelData.ID),
			Throughput.lastMonth(channelData.ID)
		]);

		const hourData = [];
		const dayLabels = [];
		const dayData = [];

		for (const row of lastDayData) {
			hourData.push(Number(row.Amount));
		}

		for (const row of lastMonthData) {
			dayLabels.push(new sb.Date(row.Timestamp).format("D j.n.Y"));
			dayData.push(Number(row.Amount));
		}

		res.render("channel-activity", {
			title: `Activity - Channel ${channelData.ID}`,
			hourData: JSON.stringify(hourData),
			dayData: JSON.stringify(dayData),
			dayLabels: JSON.stringify(dayLabels),
			channelName: channelData.Name
		});
	});

	Router.get("/detail/:id/filter/list", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Target channel has no filter data"
			});
		}

		const { data } = await sb.Got("Supinic", `/bot/filter/channel/${channelID}/list`).json();
		const printData = data.map(i => ({
			ID: i.ID,
			User: i.userName ?? "(all)",
			Command: i.commandName ?? "(all)",
			Created: new sb.Date(i.created).format("Y-m-d H:i"),
			Issuer: i.issuerName
		}));

		res.render("generic-list-table", {
			title: `Filters - Channel ${channelID} - Supibot`,
			data: printData,
			head: ["ID", "User", "Command", "Created", "Issuer"],
			pageLength: 10
		});
	});

	return Router;
})();
