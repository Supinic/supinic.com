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
	 * @apiSuccess {string} name
	 * @apiSuccess {number} [tier]
	 * @apiSuccess {string} type Emote type - twitch, ffz, bttv, ...
	 * @apiSuccess {string} [raffle] ISO date string - raffle date
	 * @apiSuccess {string} [text] Emote origin description
	 * @apiSuccess {string} [emoteAdded] ISO date string - when the emote was published
	 * @apiSuccess {string} [available] Whether the emote image is available, or if a backup exists
	 * @apiSuccess {string} [url] Proper emote URL - either original, or a backup, or none
	 * @apiSuccess {string} [notes] Custom notes
	 **/
	Router.get("/list", async (req, res) => {
		const data = await Origin.fetchAll();
		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();