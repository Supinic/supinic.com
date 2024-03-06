const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/", async (req, res) => {
		const { userID } = await WebUtils.getUserLevel(req, res);
		const searchParams = WebUtils.authenticateLocalRequest(userID);

		const response = await sb.Got("Supinic", {
			method: "POST",
			url: `bot/restart`,
			searchParams,
			throwHttpErrors: false
		});

		if (response.ok) {
			res.render("generic", {
				data: `OK`
			});
		}
		else {
			res.render("generic", {
				data: `You are not authorized to do this`
			});
		}
	});

	return Router;
})();
