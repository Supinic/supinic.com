const Express = require("express");
const Router = Express.Router();

const Tag = require("../../../modules/track/tag.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const data = await Tag.list();
		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/:id", async (req, res) => {
		const tagID = Number(req.params.id);
		if (!tagID) {
			return WebUtils.apiFail(res, 400, "No tag ID provided");
		}

		const data = await Tag.get(tagID);
		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
