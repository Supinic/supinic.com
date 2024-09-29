const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";


	const headers = ["ID", "Type", "Title", "Created"];

	const formatChangelogList = (req, res, data) => {
		const renderData = data.map(i => {
			const created = new sb.Date(i.created);
			return {
				ID: `<a href="/data/changelog/detail/${i.ID}">${i.ID}</a>`,
				Type: i.type,
				Title: i.title,
				Created: {
					value: created.format("Y-m-d"),
					dataOrder: created.valueOf()
				}
			};
		});

		res.render("generic-list-table", {
			title: "Changelog entry list",
			data: renderData,
			head: headers,
			pageLength: 50,
			sortColumn: 3,
			sortDirection: "desc",
			openGraphDefinition: [
				{
					property: "title",
					content: `Changelog entry list`
				},
				{
					property: "description",
					content: "This is a list of all Supibot + Website + other projects' changelog entries."
				}
			]
		});
	};

	Router.get("/list", async (req, res) => {
		const response = await sb.Got.get("Supinic")({
			url: "data/changelog/list"
		});
		const { data } = response.body;
		formatChangelogList(req, res, data);
	});

	Router.get("/lookup", async (req, res) => {
		if (!req.query.ID) {
			formatChangelogList(req, res, []);
			return;
		}

		const { data } = await sb.Got.get("Supinic")({
			url: "data/changelog/lookup",
			searchParams: {
				ID: req.query.ID // should always be comma-separated string
			}
		}).json();

		formatChangelogList(req, res, data);
	});

	Router.get("/detail/:id", async (req, res) => {
		const response = await sb.Got.get("Supinic")({
			url: `data/changelog/detail/${req.params.id}`
		});


		if (response.statusCode !== 200) {
			return res.status(response.statusCode).render("error", {
				error: WebUtils.formatErrorMessage(response.statusCode),
				message: response.body.error.message
			});
		}

		const detail = response.body.data;
		const data = {
			ID: detail.ID,
			Type: detail.type,
			Title: detail.title,
			Created: new sb.Date(detail.created).format("Y-m-d H:i:s"),
			Description: detail.description ?? "N/A",
			Suggestion: (detail.suggestion)
				? `<a href="/data/suggestion/${detail.suggestion}">${detail.suggestion}</a>`
				: "N/A",
			"Github link": (detail.githubLink)
				? `<a href="${detail.githubLink}">https:${detail.githubLink}</a>`
				: "N/A"
		};

		res.render("generic-detail-table", {
			title: `Changelog ${detail.ID}`,
			data,
			openGraphDefinition: [
				{
					property: "title",
					content: `${detail.type} changelog entry ${detail.ID} - ${detail.title}`
				},
				{
					property: "description",
					content: detail.description ?? "N/A"
				}
			]
		});
	});

	return Router;
})();
