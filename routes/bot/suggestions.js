module.exports = (function () {
	"use strict";
	
	const Suggestion = require("../../modules/data/suggestion.js");

	const Express = require("express");
	const Router = Express.Router();

	const prettifyData = (data) => data.map(i => ({
		ID: i.ID,
		Name: i.userName,
		Text: i.text,
		Status: i.status,
		Priority: {
			value: i.priority ?? "N/A",
			dataOrder: (i.priority === null)
				? -1
				: i.priority
		},
		Notes: (i.notes)
			? `<div style="text-decoration: underline; cursor: zoom-in;" title="${i.notes}">Hover</div>`
			: "N/A",
		Update: (i.lastUpdate)
			? sb.Utils.timeDelta(new sb.Date(i.lastUpdate))
			: "N/A"
	}));

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("data/suggestion/list").json();
		const printData = prettifyData(data);

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25,
			sortColumn: 0,
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

		const { data } = await sb.Got.instances.Supinic({
			url: "data/suggestion/list",
			searchParams: new sb.URLParams()
				.set("userName", res.locals.authUser.login)
				.toString()
		}).json();

		if (data.length === 0) {
			return res.render("generic", {
				data: `
					<center>
						<h5>
							You have not made any suggestions so far.
							<br>
							Check this guide for Twitch:
						</h5>
						<br>
						<img alt="guide" src="/public/img/suggestion-guide.png">
					</center>	
				`
			});
		}

		const printData = prettifyData(data);
		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "desc"
		});
	});

	return Router;
})();