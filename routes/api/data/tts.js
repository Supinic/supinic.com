const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");
const { locales, voices } = require("./tts-data.json");

module.exports = (function () {
	"use strict";

	Router.get("/google/list", async (req, res) => WebUtils.apiSuccess(res, locales));

	Router.get("/streamelements/list", async (req, res) => WebUtils.apiSuccess(res, voices));

	return Router;
})();
