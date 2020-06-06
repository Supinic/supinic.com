module.exports = (function () {
	"use strict";
	
	const Suggestion = require("../../modules/data/suggestion.js");

	const Express = require("express");
	const Router = Express.Router();

	const prettifyData = (data) => data.map(i => ({
		Author: i.userName,
		Text: i.text,
		Status: i.status,
		Priority: {
			value: i.priority ?? "N/A",
			dataOrder: (i.priority === null)
				? -1
				: i.priority
		},
		Update: (i.lastUpdate)
			? {
				value: sb.Utils.timeDelta(new sb.Date(i.lastUpdate)),
				dataOrder: new sb.Date(i.lastUpdate).valueOf()
			}
			: {
				value: "N/A",
				dataOrder: 0
			},
		ID: `<a href="/data/suggestion/${i.ID}">${i.ID}</a>`
	}));

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("data/suggestion/list").json();
		const printData = prettifyData(data);

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25,
			sortColumn: 5,
			sortDirection: "desc",
			specificFiltering: true
		});
	});

	Router.get("/:id", async (req, res) => {
		const suggestionID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(suggestionID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Invalid suggestion ID"
			});
		}

		const { data } = await sb.Got.instances.Supinic(`data/suggestion/${suggestionID}`).json();
		if (!data) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Suggestion does not exist"
			});
		}

		res.render("generic-detail-table", {
			data: {
				ID: data.ID,
				"Created by": data.username,
				"Created on": new sb.Date(data.date).format("Y-m-d H:i:s"),
				Category: data.category,
				Status: data.status,
				Priority: data.priority ?? "N/A",
				Text: data.text ?? "N/A",
				Notes: data.notes   ?? "N/A",
				"Last update": (data.lastUpdate)
					? new sb.Date(data.lastUpdate).format("Y-m-d H:i:s")
					: "N/A"
			}
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

	return Router;
})();