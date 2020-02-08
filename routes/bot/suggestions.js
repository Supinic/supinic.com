module.exports = (function () {
	"use strict";
	
	const Suggestion = require("../../modules/data/suggestion.js");
	const UserAlias = require("../../modules/chat-data/user-alias.js");

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const data = (await Suggestion.list()).map(i => ({
			ID: i.ID,
			Name: i.User_Name,
			Text: i.Text,
			Category: i.Category,
			Status: i.Status,
			Date: {
				dataOrder: i.Date.valueOf(),
				value: i.Date.format("Y-m-d")
			},
			Notes: (i.Notes)
				? `<div style="text-decoration: underline; cursor: zoom-in;" title="${i.Notes}">Hover</div>`
				: "N/A"
		}));

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 25,
			sortColumn: 5,
			sortDirection: "desc",
			specificFiltering: true
		});
	});

	Router.get("/stats", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "Your session timed out, please log in again"
			});
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your suggestions"
			});
		}

		const {Count: totalCount} = (await Suggestion.selectSingleCustom(rs => rs
			.select("COUNT(*) AS Count")
		));

		const rawData = await Suggestion.selectMultipleCustom(rs => rs
			.select("COUNT(*) AS Amount")
			.where("User_Alias = %n", auth.userID)
			.groupBy("Status")
		);

		const userCount = rawData.reduce((acc, cur) => acc += cur.Amount, 0);
		const data = rawData.map(i => ({
			Status: i.Status,
			Count: i.Amount,
			"% total": sb.Utils.round(i.Amount / totalCount * 100, 2),
			"% yours": sb.Utils.round(i.Amount / userCount * 100, 2)
		}));

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 25
		});
	});

	Router.get("/mine", async (req, res) => {
		if (!res || !res.locals) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "Your session timed out, please log in again"
			});
		}
		else if (!res.locals.authUser) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your suggestions"
			});
		}

		const userData = await UserAlias.selectSingleCustom(q => q.where("Name = %s", res.locals.authUser.login));
		const data = await Suggestion.listByUser(userData.ID);

		res.render("generic-list-table", {
			data: data,
			head: ["ID", "Date", "Text", "Category", "Status", "Notes"],
			pageLength: 25,
			sortColumn: 1,
			sortDirection: "desc"
		});
	});

	return Router;
})();