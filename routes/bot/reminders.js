/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../modules/chat-data/channel.js");

	const columns = {
		list: ["Created", "Sender", "Recipient", "Text", "Scheduled", "ID"],
		history: ["Created", "Sender", "Recipient", "Text", "Scheduled", "ID"],
		lookup: ["Active", "Created", "Sender", "Recipient", "Text", "Scheduled", "ID"]
	};

	const formatReminderList = async (req, res, target) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const searchParams = sb.WebUtils.authenticateLocalRequest(userID, null);
		if (target === "lookup") {
			const IDs = (req.query.IDs ?? "");
			searchParams.set("IDs", IDs);
		}

		const { statusCode, body } = await sb.Got("Supinic", {
			url: `bot/reminder/${target}`,
			searchParams: searchParams.toString(),
			throwHttpErrors: false
		});

		if (statusCode !== 200) {
			return res.status(statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(statusCode),
				message: body.error.message
			});
		}

		const user = res.locals.authUser.login.toLowerCase();
		const sortedData = body.data.sort((a, b) => b.ID - a.ID);

		const data = sortedData.map(i => {
			if (i.author.toLowerCase() === user) {
				i.author = "(You)";
			}
			if (i.target.toLowerCase() === user) {
				i.target = "(You)";
			}

			const schedule = (i.schedule) ? new sb.Date(i.schedule) : null;
			const obj = {};
			if (target === "lookup") {
				obj.Active = i.active ? "Yes" : "No";
			}

			Object.assign(obj, {
				Created: new sb.Date(i.created).format("Y-m-d"),
				Sender: i.author,
				Recipient: i.target,
				Text: i.text,
				Scheduled: {
					dataOrder: (schedule) ? schedule.valueOf() : 0,
					value: (schedule)
						? `<div class="hoverable" title="UTC: ${schedule.toUTCString()}">${sb.Utils.timeDelta(schedule)}</div>`
						: "N/A",
				},
				ID: `<a target="_blank" href="/bot/reminder/${i.ID}">${i.ID}</a>`
			});

			return obj;
		});

		const titleType = (target === "history") ? "historical (inactive)" : "active";
		return res.render("generic-list-table", {
			data,
			title: `Reminder list - ${titleType}`,
			head: columns[target],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "desc",
			specificFiltering: true,
			extraCSS: `
				div.hoverable {
					text-decoration: underline dotted;
				}
			`
		});
	};

	Router.get("/list", async (req, res) => {
		return await formatReminderList(req, res, "list");
	});

	Router.get("/history", async (req, res) => {
		return await formatReminderList(req, res, "history");
	});

	Router.get("/lookup", async (req, res) => {
		return await formatReminderList(req, res, "lookup");
	});

	Router.get("/:id", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return res.status(400).render("error", {
				error: sb.WebUtils.formatErrorMessage(400),
				message: "Malformed reminder ID"
			});
		}

		const searchParams = sb.WebUtils.authenticateLocalRequest(userID, null);
		const { statusCode, body } = await sb.Got("Supinic", {
			url: `bot/reminder/${ID}`,
			searchParams: searchParams.toString()
		});

		if (statusCode !== 200) {
			return res.status(statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(statusCode),
				message: body.error.message
			});
		}

		const rawData = body.data;
		const [senderUserData, recipientUserData] = await Promise.all([
			sb.User.get(rawData.userFrom),
			sb.User.get(rawData.userTo),
		]);

		const data = {
			ID: rawData.ID,
			Sender: senderUserData.Name,
			Recipient: recipientUserData.Name,
			"Created in channel": (rawData.channel)
				? (await Channel.getRow(rawData.channel)).values.Name
				: "(created in PMs)",
			Text: rawData.text,
			Pending: (rawData.active) ? "yes" : "no",
			Created: new sb.Date(rawData.created).format("Y-m-d H:i:s"),
			Scheduled: (rawData.schedule)
				? new sb.Date(rawData.schedule).format("Y-m-d H:i:s")
				: "(not scheduled)",
			Private: (rawData.privateMessage) ? "yes" : "no"
		};

		res.render("generic-detail-table", { data });
	});

	return Router;
})();
