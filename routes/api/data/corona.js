const Express = require("express");
const Router = Express.Router();

const Place = require("../../../modules/corona/place.js");
const Status = require("../../../modules/corona/status.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	/**
	 * @api {get} /data/corona/global/latest Corona - Latest data
	 * @apiName GetLatestCoronaData
	 * @apiDescription Posts the list of latst corona data by country (not regions!)
	 * @apiGroup Corona
	 * @apiPermission none
	 * @apiSuccess {Object[]} data
	 */
	Router.get("/global/latest", async (req, res) => {
		const countryIDs = (await Place.getCountries()).map(i => i.ID);
		const data = (await Status.latest()).filter(status => countryIDs.includes(status.Place));

		return WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/corona/region/<region>/latest Corona - Latest data
	 * @apiName GetLatestCoronaData
	 * @apiDescription Posts the list of latst corona data by country (not regions!)
	 * @apiGroup Corona
	 * @apiPermission none
	 * @apiError (400) InvalidRequest If no region is provided
	 * @apiSuccess {string[]} data
	 */
	Router.get("/region/:region/latest", async (req, res) => {
		const { region } = req.params;
		if (!region) {
			return WebUtils.apiFail(res, 400, "No region provided");
		}

		const regionIDs = (await Place.getRegions(region)).map(i => i.ID);
		const data = (await Status.latest()).filter(status => regionIDs.includes(status.Place));

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
