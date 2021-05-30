module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Changelog = require("../../../modules/data/changelog.js");

	Router.get("/list", async (req, res) => {
		const data = await Changelog.selectAll();
		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/lookup", async (req, res) => {
		const list = (req.query.ID || []).map(Number).filter(Boolean);
		if (list.length === 0) {
			return sb.WebUtils.apiSuccess(res, []);
		}

		const data = await Changelog.selectMultipleCustom(q => q.where("ID IN %n+", list));
		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/detail/:id", async (req, res) => {
		const { id } = req.params;
		const changelogID = Number(id);

		if (!sb.Utils.isValidInteger(changelogID)) {
			return sb.WebUtils.apiFail(res, 400, "Invalid ID provided");
		}

		const row = await Changelog.getRow(changelogID);
		if (!row) {
			return sb.WebUtils.apiFail(res, 404, "Provided ID does not exist");
		}

		return sb.WebUtils.apiSuccess(res, row.valuesObject);
	});

	return Router;
})();
