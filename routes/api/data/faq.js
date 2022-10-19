const Express = require("express");
const Router = Express.Router();

const FAQ = require("../../../modules/data/faq.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const data = await FAQ.selectAll();
		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
