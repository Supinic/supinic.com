const Express = require("express");
const Router = Express.Router();

const Changelog = require("../../../modules/data/changelog.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const data = await Changelog.selectAll();
		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/lookup", async (req, res) => {
		if (!req.query.ID) {
			return WebUtils.apiSuccess(res, []);
		}

		const rawList = (Array.isArray(req.query.ID))
			? req.query.ID
			: req.query.ID.split(",");

		const list = rawList.map(Number).filter(i => sb.Utils.isValidInteger(i));
		if (list.length === 0) {
			return WebUtils.apiSuccess(res, []);
		}

		const data = await Changelog.selectMultipleCustom(q => q.where("ID IN %n+", list));
		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/detail/:id", async (req, res) => {
		const { id } = req.params;
		const changelogID = Number(id);

		if (!sb.Utils.isValidInteger(changelogID)) {
			return WebUtils.apiFail(res, 400, "Invalid ID provided");
		}

		const row = await Changelog.getRow(changelogID);
		if (!row) {
			return WebUtils.apiFail(res, 404, "Provided ID does not exist");
		}

		return WebUtils.apiSuccess(res, row.valuesObject);
	});

	return Router;
})();
