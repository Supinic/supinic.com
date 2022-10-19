const Express = require("express");
const compression = require("compression");
const zlib = require("zlib");
const Router = Express.Router();

const DallE = require("../../../modules/data/dall-e.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.use("*", compression({
		level: zlib.Z_BEST_COMPRESSION,
		strategy: zlib.Z_RLE,
		threshold: 5_000 // at least 5kB must be sent in order to trigger compression
	}));

	Router.get("/list/client", async (req, res) => {
		const data = await DallE.getAll();
		const resultData = data.map(i => ({
			ID: `<a href="/data/dall-e/detail/${i.ID}">${i.ID}</a>`,
			Prompt: sb.Utils.wrapString(i.Prompt, 150),
			Created: i.Created.format("Y-m-d H:i")
		}));

		return WebUtils.apiSuccess(res, resultData, { skipCaseConversion: true });
	});

	Router.get("/detail/:id", async (req, res) => {
		const data = await DallE.getImages(req.params.id);
		if (!data) {
			return WebUtils.apiFail(res, 404, "Image set does not exist");
		}

		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/detail/:id/preview/:index", async (req, res) => {
		const index = Number(req.params.index);
		if (!sb.Utils.isValidInteger(index)) {
			return WebUtils.apiFail(res, 400, "Malformed index provided");
		}
		else if (index < 0 || index > 8) {
			return WebUtils.apiFail(res, 400, "Index out of bounds <0..8>");
		}

		const data = await DallE.getImages(req.params.id);
		if (!data) {
			return WebUtils.apiFail(res, 404, "Image set does not exist");
		}

		if (req.query.direct) {
			const buffer = Buffer.from(data.Images[index], "base64");
			return res.status(200)
				.type("png")
				.send(buffer);
		}
		else {
			return WebUtils.apiSuccess(res, {
				index,
				image: data.Images[index] ?? null
			});
		}
	});

	Router.get("/detail/:id/meta", async (req, res) => {
		const data = await DallE.selectCustom(q => q
			.select("ID", "Prompt", "Created", "Creation_Time")
			.where("ID = %s", req.params.id)
			.single()
		);

		if (!data) {
			return WebUtils.apiFail(res, 404, "Image set not found");
		}
		else {
			return WebUtils.apiSuccess(res, data);
		}
	});

	return Router;
})();
