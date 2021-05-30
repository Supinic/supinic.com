module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/:digest", async (req, res) => {
		const { digest } = req.params;
		const response = await sb.Got("Supinic", {
			url: `relay/${digest}`,
			throwHttpErrors: false
		});

		if (response.statusCode !== 200) {
			return res.status(response.statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(response.statusCode),
				message: response.body.error.message
			});
		}

		const { link } = response.body.data;
		res.redirect(link);
	});

	return Router;
})();
