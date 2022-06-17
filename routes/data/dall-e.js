module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const existingCache = new Set();

	Router.get("/detail/:id", async (req, res) => {
		const { id } = req.params;

		if (!existingCache.has(id)) {
			const response = await sb.Got("Supinic", `data/dall-e/detail/${id}/exists`);

			if (!response.body.data) {
				return res.status(503).render("error", {
					error: sb.WebUtils.formatErrorMessage(503),
					message: "API is currently overloaded, try again later"
				});
			}
			else if (!response.body.data.exists) {
				return res.status(404).render("error", {
					error: sb.WebUtils.formatErrorMessage(404),
					message: "Image set does not exist"
				});
			}
			else {
				existingCache.add(id);
			}
		}

		res.render("dall-e-display", {
			id,
			title: "DALL-E images"
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
