const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "data/bad-apple/list").json();
		const renderData = data.map(i => {
			const notesString = (i.notes) ? " 📝" : "";
			const detailLink = `<a href="/data/bad-apple/detail/${i.ID}">${i.ID}${notesString}</a>`;

			const timestamp = (i.timestamp) ? `?t=${i.timestamp}` : "";
			const deviceLink = (i.device && i.link)
				? `<a href="//youtu.be/${i.link}${timestamp}">${i.device}</a>`
				: ((i.device)
					? i.device
					: "N/A");

			return {
				Device: deviceLink,
				Type: i.type ?? "N/A",
				Published: (i.published)
					? new sb.Date(i.published).format("Y-m-d")
					: "N/A",
				"↔": {
					value: i.width ?? "X",
					dataOrder: i.width ?? 0
				},
				"↕": {
					value: i.height ?? "X",
					dataOrder: i.height ?? 0
				},
				FPS: {
					value: i.fps ?? "N/A",
					dataOrder: i.fps ?? 0
				},
				ID: {
					value: detailLink,
					dataOrder: i.ID
				}
			};
		});

		res.render("generic-list-table", {
			title: "Bad Apple renditions",
			data: renderData,
			head: Object.keys(renderData[0]),
			pageLength: 50,
			sortColumn: 0,
			sortDirection: "asc"
		});
	});

	Router.get("/detail/:id", async (req, res) => {
		const { statusCode, body } = await sb.Got("Supinic", `data/bad-apple/detail/${req.params.id}`);
		if (statusCode !== 200) {
			return res.status(statusCode).render("error", {
				error: WebUtils.formatErrorMessage(statusCode),
				message: body.error.message
			});
		}

		const detail = body.data;
		const timestamp = (detail.timestamp) ? `?t=${detail.timestamp}` : "";
		const data = {
			ID: detail.ID,
			Device: detail.device,
			Status: detail.status,
			Link: `<a href="//youtu.be/${detail.link}${timestamp}">${detail.link}</a>`,
			Type: detail.type ?? "N/A",
			Published: (detail.published)
				? new sb.Date(detail.published).format("Y-m-d")
				: "N/A",
			Height: detail.height ?? "N/A",
			Width: detail.width ?? "N/A",
			FPS: detail.fps ?? "N/A",
			Notes: (detail.notes) ? detail.notes.replace(/\n/g, "<br>") : "N/A"
		};

		res.render("generic-detail-table", {
			title: `Bad Apple! ${detail.device} (ID ${detail.ID})`,
			data
		});
	});

	return Router;
})();
