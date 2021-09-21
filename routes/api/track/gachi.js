module.exports = (function () {
	"use strict";
	const Express = require("express");
	const Router = Express.Router();

	const Track = require("../../../modules/track/track.js");

	/**
	 * @api {get} /track/gachi/random Random Gachimuchi track
	 * @apiName GetRandomGachiTrack
	 * @apiDescription Fetches the detail of a singular Track with the Gachimuchi tag, picked randomly
	 * @apiGroup Track-List
	 * @apiPermission any
	 * @apiSuccess {Object} track Single track object
	 * @apiSuccess {number} track.ID
	 * @apiSuccess {string} track.name
	 * @apiSuccess {number} track.videoType
	 * @apiSuccess {string} track.trackType
	 * @apiSuccess {number} track.duration
	 * @apiSuccess {boolean} track.available
	 * @apiSuccess {string} track.published
	 * @apiSuccess {string} [track.notes]
	 * @apiSuccess {string} track.addedBy
	 * @apiSuccess {string} track.addedOn
	 * @apiSuccess {string} [track.lastEdit]
	 * @apiSuccess {string[]} track.aliases
	 * @apiSuccess {object[]} track.authors
	 * @apiSuccess {string} track.authors.role
	 * @apiSuccess {number} track.authors.ID
	 * @apiSuccess {string} track.authors.name
	 * @apiSuccess {string[]} track.tags
	 * @apiSuccess {string]} track.relatedTracks.relationship
	 * @apiSuccess {number} track.relatedTracks.fromID
	 * @apiSuccess {number} track.relatedTracks.toID
	 * @apiSuccess {string} track.relatedTracks.name
	 * @apiSuccess {number} [track.legacyID]
	 * @apiSuccess {number} track.favourites
	 * @apiError (400) InvalidRequest ID is out of range<br>
	 *     ID is out of bounds (does not exist)
	 **/
	Router.get("/random", async (req, res) => {
		const track = await Track.selectCustom(rs => rs
			.select("ID")
			.join({
				toDatabase: "music",
				toTable: "Track_Tag",
				on: "Track.ID = Track_Tag.Track"
			})
			.where("Track_Tag.Tag = %n", 6)
			.orderBy("RAND()")
			.limit(1)
			.single()
		);

		const response = await sb.Got("Supinic", `track/detail/${track.ID}`);
		if (response.statusCode !== 200) {
			return sb.WebUtils.apiFail(res, response.statusCode, response.body.message, {
				causeData: response.body
			});
		}

		return sb.WebUtils.apiSuccess(res, response.body.data);
	});

	return Router;
})();
