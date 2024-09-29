const Express = require("express");
const Router = Express.Router();

const Playsound = require("../../../modules/data/playsound.js");
const WebUtils = require("../../../utils/webutils.js");

const cacheKeys = {
	PLAYSOUNDS_ENABLED: "playsounds-enabled"
};

module.exports = (function () {
	"use strict";

	/**
	 * @api {get} /bot/playsound/enabled Playsound - Enabled
	 * @apiName GetPlaysoundEnabled
	 * @apiDescription Fetches whether the playsounds are currently enabled
	 * @apiGroup Stream
	 * @apiPermission any
	 * @apiSuccess {boolean} enabled
	 */
	Router.get("/enabled", async (req, res) => {
		const status = await sb.Cache.getByPrefix(cacheKeys.PLAYSOUNDS_ENABLED);
		return WebUtils.apiSuccess(res, {
			enabled: Boolean(Number(status))
		});
	});

	/**
	 * @api {get} /bot/playsound/list Playsound - List
	 * @apiName GetPlaysoundList
	 * @apiDescription Fetches the full list of currently available playsounds
	 * @apiGroup Stream
	 * @apiPermission any
	 * @apiSuccess {Object[]} playsounds List of playsounds
	 * @apiSuccess {string} playsounds.name Playsound name to trigger
	 * @apiSuccess {string} playsounds.filename Playsound filename as it appears on the drive
	 * @apiSuccess {string} [playsounds.notes] Additional info
	 */
	Router.get("/list", async (req, res) => {
		const playsounds = await Playsound.selectAll();
		const data = playsounds.map(i => ({
			name: i.Name,
			filename: i.Filename,
			cooldown: i.Cooldown,
			notes: i.Notes
		}));

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
