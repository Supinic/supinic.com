/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Reminder = require("../../modules/chat-data/reminder.js");

	Router.get("/list", async (req, res) => {
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

		const user = res.locals.authUser.login.toLowerCase();
		const rawData = await Reminder.listByUser(user);

		const data = rawData.map(i => {
			if (i.Author.toLowerCase() === user) {
				i.Author = "(You)";
			}
			if (i.Target.toLowerCase() === user) {
				i.Target = "(You)";
			}

			return {
				Created: i.Created.format("Y-m-d H:i:s"),
				Active: (i.Active) ? "Yes" : "No",
				Author: i.Author,
				Target: i.Target,
				Channel: (i.Channel_Name) ? i.Channel_Name : "<private reminder>",
				Text: i.Text,
				Scheduled: (i.Schedule) ? i.Schedule.format("Y-m-d H:i:s") : "N/A",
				ID: i.ID
			};
		}).sort((a, b) => a.ID - b.ID);

		res.render("generic-list-table", {
			data: data,
			head: (data[0])
				? Object.keys(data[0])
				: ["Created", "Active", "Author", "Target", "Channel", "Text", "Scheduled", "ID"],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "desc"
		});
	});

	return Router;
})();
