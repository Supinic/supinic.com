module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/detail/:id", async (req, res) => {
		const { id } = req.params;
		const response = await sb.Got("Supinic", `data/dall-e/detail/${id}/exists`);
		if (!response.body.data.exists) {
			return res.status(404).render("error", {
				error: sb.WebUtils.formatErrorMessage(404),
				message: "Image set does not exist"
			});
		}

		res.render("dall-e-display", {
			id,
			title: "DALL-E images"
		});
	});

	return Router;
})();
