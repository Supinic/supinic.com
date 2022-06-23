module.exports = (function () {
	"use strict";

	const Express = require("express");
	const compression = require("compression");
	const zlib = require("zlib");

	const Router = Express.Router();

	const DallE = require("../../../modules/data/dall-e.js");

	Router.use("*", compression({
		level: zlib.Z_BEST_COMPRESSION,
		strategy: zlib.Z_RLE,
		threshold: 5_000 // at least 5kB must be sent in order to trigger compression
	}));

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
		else if (index < 0 || index > 8) {
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

	Router.get("/detail/:id/meta", async (req, res) => {
		const data = await DallE.selectCustom(q => q
			.select("ID", "Prompt", "Created", "Creation_Time")
			.where("ID = %s", req.params.id)
			.single()
		);

		if (!data) {
			return sb.WebUtils.apiFail(res, 404, "Image set not found");
		}
		else {
			return sb.WebUtils.apiSuccess(res, data);
		}
	});

	return Router;
})();
