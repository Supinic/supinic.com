module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const FAQ = require("../../../modules/data/faq.js");

	Router.get("/list", async (req, res) => {
		const data = await FAQ.selectAll();
		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();