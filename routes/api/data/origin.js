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
	 * @apiSuccess {string} name
	 * @apiSuccess {string} text
	 * @apiSuccess {string} platform
	 * @apiSuccess {string} [emoteAdded] ISO date string - when the emote was published
	 * @apiSuccess {string} [notes] Custom notes
	 **/
	Router.get("/list", async (req, res) => {
		const data = await Origin.selectCustom(rs => rs
			.select("ID", "Name", "Text", "Type", "Emote_Added", "Notes")
			.orderBy("Name ASC")
		);

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();