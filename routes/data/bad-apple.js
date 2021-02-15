module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "/data/bad-apple/list").json();
		const renderData = data.map(i => {
			const deviceLink = (i.device && i.link)
				? `<a href="${i.link}">${i.device}</a>`
				: (i.device)
					? i.device
					: "N/A"

			return {
				Device: deviceLink,
				Type: i.type ?? "N/A",
				Published: (i.published)
					? new sb.Date(i.published).format("Y-m-d")
					: "N/A",
				H: {
					value: i.height ?? "X",
					dataOrder: i.height ?? 0
				},
				W: {
					value: i.width ?? "X",
					dataOrder: i.width ?? 0
				},
				FPS: {
					value: i.fps ?? "N/A",
					dataOrder: i.fps ?? 0
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

	Router.get("/:id", async (req, res) => {
		const { statusCode, body } = await sb.Got("Supinic", "/data/bad-apple/" + req.params.id);
		if (statusCode !== 200) {
			res.status(statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(statusCode),
				message: body.data.error.message
			});
		}

		const detail = body.data;
		const data = {
			Device: detail.device,
			Link: `<a href="${detail.link}">${detail.link}</a>`,
			Type: i.type ?? "N/A",
			Published: (i.published)
				? new sb.Date(i.published).format("Y-m-d")
				: "N/A",
			Height: i.height ?? "N/A",
			Width: i.width ?? "N/A",
			FPS: i.fps ?? "N/A",
			Notes: i.notes ?? "N/A"
		};

		res.render("generic-detail-table", {
			title: `Detail - Channel ${channelData.ID} - Supibot`,
			data
		});
	});

	return Router;
})();