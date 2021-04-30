module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Origin = require("../../../modules/data/origin.js");

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
		return sb.WebUtils.apiSuccess(res, data);
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
	 **/
	Router.get("/detail/:id", async (req, res) => {
		const { id } = req.params;
		const originID = Number(id);
		if (!sb.Utils.isValidInteger(originID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed origin ID provided");
		}

		const items = await Origin.fetch(originID);
		if (items.length === 0) {
			return sb.WebUtils.apiFail(res, 404, "No origin exists for provided ID");
		}

		return sb.WebUtils.apiSuccess(res, items[0]);
	});

	Router.get("/image/:id", async (req, res) => {
		const { id } = req.params;
		const originID = Number(id);
		if (!sb.Utils.isValidInteger(originID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed origin ID provided");
		}

		const row = await Origin.getRow(originID);
		if (!row) {
			return sb.WebUtils.apiFail(res, 404, "Emote not found");
		}

		const url = Origin.parseURL(row.valuesObject);
		res.set("Cache-Control", "max-age=86400");
		res.redirect(url);
	});

	return Router;
})();