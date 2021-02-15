module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const BadApple = require("../../../modules/data/bad-apple.js");

	Router.get("/list", async (req, res) => {
		return await BadApple.selectAll();
	});

	Router.get("/:id", async (req, res) => {
		const { id } = req.params;
		const appleID = Number(id);

		if (!sb.Utils.isValidInteger(appleID)) {
			return sb.WebUtils.apiFail(res, 400, "Invalid ID provided");
		}

		const row = await BadApple.getRow(appleID);
		if (!row) {
			return sb.WebUtils.apiFail(res, 404, "Provided ID does not exist");
		}

		return row.valuesObject;
	});

	return Router;
})();