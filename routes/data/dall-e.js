module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const metaCache = new Map();

	Router.get("/list", async (req, res) => {
		res.render("generic-ajax-list-table", {
			head: ["ID", "Prompt", "Created"],
			url: "https://supinic.com/api/data/dall-e/list/client",
			sortDirection: "desc",
			sortColumn: 2,
			pageLength: 50,
			specificFiltering: true
		});
	});

	Router.get("/detail/:id", async (req, res) => {
		const { id } = req.params;

		if (!metaCache.has(id)) {
			const response = await sb.Got("Supinic", `data/dall-e/detail/${id}/meta`);
			if (response.statusCode !== 200) {
				return res.status(response.statusCode).render("error", {
					error: sb.WebUtils.formatErrorMessage(response.statusCode),
					message: response.body.error.message
				});
			}
			else {
				metaCache.set(id, response.body.data);
			}
		}

		const metaData = metaCache.get(id);
		res.render("dall-e-display", {
			id,
			title: "DALL-E image set",
			openGraphDefinition: [
				{
					property: "title",
					content: `DALL-E image set`
				},
				{
					property: "description",
					content: `Prompt: "${metaData.prompt}"`
				},
				{
					property: "image",
					content: `https://supinic.com/data/dall-e/detail/${id}/preview/0`
				}
			]
		});
	});

	Router.get("/detail/:id/preview/:index", async (req, res) => {
		const { id, index } = req.params;

		const response = await sb.Got("Supinic", `data/dall-e/detail/${id}/preview/${index}`);
		if (response.statusCode === 400) {
			return res.status(400).render("error", {
				error: sb.WebUtils.formatErrorMessage(400),
				message: "Invalid parameters provided"
			});
		}

		const { image } = response.body.data;
		const imageBuffer = Buffer.from(image, "base64");

		res.writeHead(200, {
			"Content-Type": "image/png",
			"Content-Length": imageBuffer.length
		});

		res.end(imageBuffer);
	});

	return Router;
})();
