const Express = require("express");
const Router = Express.Router();

const { getLinkParser } = require("../../utils/link-parser.js");
const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	/**
	 * @api {get} /trackData/fetch/ Fetch track data
	 * @apiName GetTrackData
	 * @apiDescription For a given video/track URL, fetches a collection of data
	 * @apiGroup Track data fetching
	 * @apiParam {string} url Track URL
	 * @apiPermission any
	 * @apiSuccess {string} type Human readable track site - one of bilibili, nicovideo, soundcloud, vimeo, vk, youtube
	 * @apiSuccess {string} ID Video ID in the context of the hosting site
	 * @apiSuccess {string} name Track name
	 * @apiSuccess {string} author Author name
	 * @apiSuccess {number} [authorID] Author's ID in the context of the hosting site, if the side provides it
	 * @apiSuccess {string} [description] Track description, if any
	 * @apiSuccess {number} duration Track duration, in seconds
	 * @apiSuccess {string} created Timestamp of track creation - ISO date string
	 * @apiSuccess {number} createdTimestamp Timestamp of track creation - as number
	 * @apiSuccess {number} [views] Amount of views the track has at the point of query, if the side provides it
	 * @apiSuccess {number} [comments] Amount of comments the track has at the point of query, if the side provides it
	 * @apiSuccess {number} [likes] Amount of views the track has at the point of query, if the side provides it
	 * @apiSuccess {string} [thumbnail] A thumbnail related to the track, if the side provides it
	 * @apiSuccess {Object} extra Extra data - usually contianing tags, more API URLs, and other data
	 * @apiError (400) InvalidRequest No URL provided<br>
	 * Track URL was not recognized and/or parsed
	 */
	Router.get("/fetch", async (req, res) => {
		const url = req.query.url;
		if (!url) {
			WebUtils.apiFail(res, 400, "No URL provided");
		}

		const LinkParser = await getLinkParser();
		try {
			const data = await LinkParser.fetchData(url);
			if (data && data.created) {
				data.createdTimestamp = data.created.valueOf();
			}

			return WebUtils.apiSuccess(res, data);
		}
		catch (e) {
			return WebUtils.apiFail(res, 400, "Link could not be parsed");
		}
	});

	/**
	 * @api {get} /trackData/available/ Fetch track availability
	 * @apiName GetTrackAvailable
	 * @apiDescription For a given video/track URL, fetches a boolean determining if the track exists on the hosting site.
	 * @apiGroup Track data fetching
	 * @apiParam {string} url Track URL
	 * @apiPermission any
	 * @apiSuccess {boolean} available Whether or not the track is available
	 * @apiError (400) InvalidRequest No URL provided<br>
	 * Track URL was not recognized and/or parsed
	 */
	Router.get("/available", async (req, res) => {
		const url = req.query.url;
		if (!url) {
			WebUtils.apiFail(res, 400, "No URL provided");
		}

		const LinkParser = await getLinkParser();
		try {
			const isAvailable = await LinkParser.checkAvailable(url);
			return WebUtils.apiSuccess(res, {
				available: isAvailable,
				link: url
			});
		}
		catch (e) {
			return WebUtils.apiFail(res, 400, "Link could not be parsed");
		}
	});

	return Router;
})();
