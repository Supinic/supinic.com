module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const BadApple = require("../../../modules/data/bad-apple.js");

	Router.get("/list", async (req, res) => {
		const data = await BadApple.selectMultipleCustom(q => q.where("Status = %s", "Approved"));
		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/detail/:id", async (req, res) => {
		const { id } = req.params;
		const appleID = Number(id);

		if (!sb.Utils.isValidInteger(appleID)) {
			return sb.WebUtils.apiFail(res, 400, "Invalid ID provided");
		}

		const row = await BadApple.getRow(appleID);
		if (!row) {
			return sb.WebUtils.apiFail(res, 404, "Provided ID does not exist");
		}

		return sb.WebUtils.apiSuccess(res, row.valuesObject);
	});

	return Router;
})();
