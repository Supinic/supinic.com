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
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} [emoteID]
	 * @apiSuccess {string} name
	 * @apiSuccess {number} [tier]
	 * @apiSuccess {string} type Emote type - twitch, ffz, bttv, ...
	 * @apiSuccess {string} [raffle] ISO date string - raffle date
	 * @apiSuccess {string} [text]
	 * @apiSuccess {string} [emoteAdded] ISO date string - when the emote was published
	 * @apiSuccess {string} [notes] Custom notes
	 **/
	Router.get("/list", async (req, res) => {
		const data = await Origin.selectCustom(rs => rs
			.select("ID", "Emote_ID", "Name", "Tier", "Type", "Raffle", "Text", "Emote_Added", "Notes")
		);

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();