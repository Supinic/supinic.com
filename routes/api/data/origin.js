const Express = require("express");
const Router = Express.Router();

const Origin = require("../../../modules/data/origin.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	/**
	 * @api {get} /data/origin/list Origin - List
	 * @apiName ListEmoteOrigins
	 * @apiDescription Fetches a list of all emote origins
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiSuccess {number} ID Internal emote list ID
	 * @apiSuccess {string} [emoteID] Emote ID used in their respective types
	 * @apiSuccess {string} name Emote name
	 * @apiSuccess {number} [tier] Tiering of emote - usually concerning Twitch: Tiers 1,2,3
	 * @apiSuccess {string} type Emote type - twitch (global/sub/bit), ffz, bttv, discord, other
	 * @apiSuccess {string} [text] Emote origin description
	 * @apiSuccess {string} [raffle] ISO date string - raffle date
	 * @apiSuccess {string} [emoteAdded] ISO date string - when the emote was published
	 * @apiSuccess {string} [emoteDeleted] ISO date string - when the emote was deleted
	 * @apiSuccess {string} [recordAdded] ISO date string - when the emote origin was added
	 * @apiSuccess {string} [available] Whether the emote image is available, or if a backup exists
	 * @apiSuccess {string} [author] User name of whoever created the emote
	 * @apiSuccess {string} [raffleWinner] User name of whoever won the emote raffle for this emote
	 * @apiSuccess {string} [reporter] User name of whoever added the emote origin
	 * @apiSuccess {string} [url] Priority emote image URL - original first, then a backup link, or null if none exist
	 * @apiSuccess {string} [notes] Custom notes
	 **/
	Router.get("/list", async (req, res) => {
		const data = await Origin.fetch();
		if (req.query.skipReplacedEmotes) {
			const filtered = data.filter(i => !i.Replaced);
			return WebUtils.apiSuccess(res, filtered);
		}
		else {
			return WebUtils.apiSuccess(res, data);
		}
	});

	/**
	 * @api {get} /data/origin/lookup Origin - lookup
	 * @apiName LookupEmoteOrigins
	 * @apiDescription Fetches a list of emote origins for provided IDs
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiSuccess {Object[]} Same structure as in `ListEmoteOrigins`
	 **/
	Router.get("/lookup", async (req, res) => {
		const { ID } = req.query;
		if (!ID) {
			return WebUtils.apiSuccess(res, []);
		}

		const numberIDs = (typeof ID === "string")
			? ID.split(",").map(Number)
			: ID.map(Number);

		if (numberIDs.some(i => !sb.Utils.isValidInteger(i))) {
			return WebUtils.apiFail(res, 400, "One or more invalid IDs requested");
		}

		const data = await Origin.fetch(...numberIDs);
		return WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/origin/list Origin - Detail
	 * @apiName GetEmoteOriginDetail
	 * @apiDescription Fetches a single emote's origin
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiSuccess {number} ID Internal emote list ID
	 * @apiSuccess {string} [emoteID] Emote ID used in their respective types
	 * @apiSuccess {string} name Emote name
	 * @apiSuccess {number} [tier] Tiering of emote - usually concerning Twitch: Tiers 1,2,3
	 * @apiSuccess {string} type Emote type - twitch (global/sub/bit), ffz, bttv, discord, other
	 * @apiSuccess {string} [text] Emote origin description
	 * @apiSuccess {string} [raffle] ISO date string - raffle date
	 * @apiSuccess {string} [emoteAdded] ISO date string - when the emote was published
	 * @apiSuccess {string} [recordAdded] ISO date string - when the emote origin was added
	 * @apiSuccess {string} [available] Whether the emote image is available, or if a backup exists
	 * @apiSuccess {string} [author] User name of whoever created the emote
	 * @apiSuccess {string} [raffleWinner] User name of whoever won the emote raffle for this emote
	 * @apiSuccess {string} [reporter] User name of whoever added the emote origin
	 * @apiSuccess {string} [url] Priority emote image URL - original first, then a backup link, or null if none exist
	 * @apiSuccess {string} [notes] Custom notes
	 * @apiSuccess {Object[]} relatedEmotes The list of other emotes that have the current one linked in their descriptions or notes
	 * @apiSuccess {number} relatedEmotes.ID
	 * @apiSuccess {string} relatedEmotes.name
	 **/
	Router.get("/detail/:id", async (req, res) => {
		const { id } = req.params;
		const originID = Number(id);
		if (!sb.Utils.isValidInteger(originID)) {
			return WebUtils.apiFail(res, 400, "Malformed origin ID provided");
		}

		const [data] = await Origin.fetch(originID);
		if (!data) {
			return WebUtils.apiFail(res, 404, "No origin exists for provided ID");
		}

		const relatedEmotes = await Origin.getRelatedEmotes(originID);
		return WebUtils.apiSuccess(res, {
			...data,
			Related_Emotes: relatedEmotes
		});
	});

	Router.get("/image/:id", async (req, res) => {
		const { id } = req.params;
		const originID = Number(id);
		if (!sb.Utils.isValidInteger(originID)) {
			return WebUtils.apiFail(res, 400, "Malformed origin ID provided");
		}

		const row = await Origin.getRow(originID);
		if (!row) {
			return WebUtils.apiFail(res, 404, "Emote not found");
		}

		const url = Origin.parseURL(row.valuesObject);
		res.set("Cache-Control", "max-age=86400");
		res.redirect(url);
	});

	return Router;
})();
