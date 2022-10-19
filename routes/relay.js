const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/:digest", async (req, res) => {
		const { digest } = req.params;
		const response = await sb.Got("Supinic", {
			url: `relay/${digest}`,
			throwHttpErrors: false
		});

		if (response.statusCode !== 200) {
			return res.status(response.statusCode).render("error", {
				error: WebUtils.formatErrorMessage(response.statusCode),
				message: response.body.error?.message ?? "N/A"
			});
		}

		const { link } = response.body.data;
		res.redirect(link);
	});

	return Router;
})();
