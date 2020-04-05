module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Place = require("../../../modules/corona/place.js");
	const Status = require("../../../modules/corona/status.js");

	/**
	 * @api {get} /data/corona/latest Corona - Latest data
	 * @apiName GetLatestCoronaData
	 * @apiDescription Posts the list of latst corona data by country (not regions!)
	 * @apiGroup Corona
	 * @apiPermission none
	 * @apiSuccess {string[]} data
	 */
	Router.get("/latest", async (req, res) => {
		const countryIDs = (await Place.getCountries()).map(i => i.ID);
		const data = (await Status.latest()).filter(status => countryIDs.includes(status.Place));

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();