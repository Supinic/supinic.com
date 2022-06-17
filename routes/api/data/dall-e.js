module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const DallE = require("../../../modules/data/dall-e.js");

	Router.get("/detail/:id", async (req, res) => {
		const data = await DallE.getImages(req.params.id);
		if (!data) {
			return sb.WebUtils.apiFail(res, 404, "Image set does not exist");
		}

		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/detail/:id/preview/:index", async (req, res) => {
		const index = Number(req.params.index);
		if (!sb.Utils.isValidInteger(index)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed index provided");
		}
		else if (index < 0 || index >= 8) {
			return sb.WebUtils.apiFail(res, 400, "Index out of bounds <0..8>");
		}

		const data = await DallE.getImages(req.params.id);
		if (!data) {
			return sb.WebUtils.apiFail(res, 404, "Image set does not exist");
		}

		return sb.WebUtils.apiSuccess(res, {
			index,
			image: data.Images[index] ?? null
		});
	});

	Router.get("/detail/:id/exists", async (req, res) => {
		const exists = await DallE.existsCustom(q => q.where("ID = %s", req.params.id));
		return sb.WebUtils.apiSuccess(res, { exists });
	});

	return Router;
})();
