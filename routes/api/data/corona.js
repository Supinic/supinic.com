module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Place = require("../../../modules/corona/place.js");
	const Status = require("../../../modules/corona/status.js");

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

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/corona/region/<region>/latest Corona - Latest data
	 * @apiName GetLatestCoronaData
	 * @apiDescription Posts the list of latst corona data by country (not regions!)
	 * @apiGroup Corona
	 * @apiPermission none
	 * @apiError (400) InvalidRequest If no region is provided
	 * @apierr {string[]} data
	 */
	Router.get("/region/:region/latest", async (req, res) => {
		const { region } = req.params;
		if (!region) {
			return sb.WebUtils.apiFail(res, 400, "No region provided");
		}

		const regionIDs = (await Place.getRegions(region)).map(i => i.ID);
		const data = (await Status.latest()).filter(status => regionIDs.includes(status.Place));

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();