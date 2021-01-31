/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../modules/chat-data/channel.js");

	const formatReminderList = async (req, res, target) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const searchParams = sb.WebUtils.authenticateLocalRequest(userID, null);
		const { statusCode, body: rawData } = await sb.Got("Supinic", {
			url: `bot/reminder/${target}`,
			searchParams: searchParams.toString(),
			throwHttpErrors: false
		});

		if (statusCode !== 200) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const user = res.locals.authUser.login.toLowerCase();
		const sortedData = rawData.sort((a, b) => b.ID - a.ID);

		const data = sortedData.map(i => {
			if (i.Author.toLowerCase() === user) {
				i.Author = "(You)";
			}
			if (i.Target.toLowerCase() === user) {
				i.Target = "(You)";
			}

			const obj = {
				Created: i.Created.format("Y-m-d"),
				Active: (i.Active) ? "Yes" : "No",
				Sender: i.Author,
				Recipient: i.Target,
				Text: i.Text,
				Scheduled: {
					dataOrder: (i.Schedule) ? i.Schedule.valueOf() : 0,
					value: (i.Schedule)
						? `<div class="hoverable" title="UTC: ${i.Schedule.toUTCString()}">${sb.Utils.timeDelta(i.Schedule)}</div>`
						: "N/A",
				},
				ID: `<a target="_blank" href="/bot/reminder/${i.ID}">${i.ID}</a>`
			};

			return obj;
		});

		return res.render("generic-list-table", {
			data,
			head: ["Created", "Active", "Author", "Target", "Channel", "Text", "Scheduled", "ID"],
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

	Router.get("/:id", async (req, res) => {
		if (!res || !res.locals) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "Your session timed out, please log in again"
			});
		}
		else if (!res.locals.authUser) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return res.status(400).render("error", {
				error: "400 Invalid Request",
				message: "Malformed reminder ID"
			});
		}

		const row = await sb.Got("Supinic", `bot/reminder/${ID}`).json();
		if (!row) {
			return res.status(400).render("error", {
				error: "404 Not Found",
				message: "Reminder ID does not exist"
			});
		}

		const rawData = row.valuesObject;
		const { userData } = res.locals.authUser;
		if (rawData.User_To !== userData.ID && rawData.User_From !== userData.ID) {
			return res.status(400).render("error", {
				error: "403 Access Denied",
				message: "This reminder was not created by you or for you"
			});
		}

		const senderUserData = (rawData.User_From === userData.ID)
			? userData
			: await sb.User.get(rawData.User_From);

		const recipientUserData = (rawData.User_To === userData.ID)
			? userData
			: await sb.User.get(rawData.User_To);

		const data = {
			ID: rawData.ID,
			Sender: senderUserData.Name,
			Recipient: recipientUserData.Name,
			"Created in channel": (rawData.Channel)
				? (await Channel.getRow(rawData.Channel)).values.Name
				: "(created in PMs)",
			Text: rawData.Text,
			Pending: (rawData.Active) ? "yes" : "no",
			Created: rawData.Created.format("Y-m-d H:i:s"),
			Scheduled: (rawData.Schedule)
				? rawData.Schedule.format("Y-m-d H:i:s")
				: "(not scheduled)",
			Private: (rawData.Private_Message) ? "yes" : "no"
		};

		res.render("generic-detail-table", { data });
	});

	return Router;
})();
