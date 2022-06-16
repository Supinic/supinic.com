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
					message: "API is currently overloaded, try again latert"
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

	return Router;
})();
