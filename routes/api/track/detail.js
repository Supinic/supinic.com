module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Track = require("../../../modules/track/track.js");
	const Favourite = require("../../../modules/track/user-favourite.js");

	/**
	 * @api {get} /track/detail/:id Track - Get detail
	 * @apiName GetTrackDetail
	 * @apiDescription Fetches full data about a specific track ID
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
	 */
	Router.get("/:id", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		const id = Number(req.params.id);
		if (!id) {
			return sb.WebUtils.apiFail(res, 400, "Provided ID is not a valid integer");
		}
		else if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}

		const trackData = await Track.get(id);
		if (trackData === null) {
			return sb.WebUtils.apiFail(res, 404, "Track ID not found");
		}
		else {
			const favourites = await Favourite.getForTrack(id);
			trackData.Favourites = favourites.filter(i => i.Active).length;

			return sb.WebUtils.apiSuccess(res, trackData);
		}
	});

	return Router;
})();
