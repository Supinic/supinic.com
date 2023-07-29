const Express = require("express");
const Router = Express.Router();

const FAQ = require("../../../modules/data/faq.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const data = await FAQ.selectMultipleCustom(rs => rs.where("Hidden = %b", false));
		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/detail/:id", async (req, res) => {
		const id = Number(req.params.id);
		if (!sb.Utils.isValidInteger(id)) {
			return WebUtils.apiFail(res, 400, "Malformed ID");
		}

		const row = await FAQ.getRow(id);
		if (!row) {
			return WebUtils.apiFail(res, 404, "FAQ entry with this ID does not exist");
		}

		return WebUtils.apiSuccess(res, row.valuesObject);
	});

	return Router;
})();
