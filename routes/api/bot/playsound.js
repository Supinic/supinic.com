module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Config = require("../../../modules/data/config.js");
	const Playsound = require("../../../modules/data/playsound.js");

	/**
	 * @api {get} /bot/playsound/enabled Playsound - Enabled
	 * @apiName GetPlaysoundEnabled
	 * @apiDescription Fetches whether or not the playsounds are currently enabled
	 * @apiGroup Stream
	 * @apiPermission any
	 * @apiSuccess {boolean} enabled
	 */
	Router.get("/enabled", async (req, res) => {
		const status = await Config.selectSingleCustom(q => q
			.where("Name = %s", "PLAYSOUNDS_ENABLED")
		);

		return sb.WebUtils.apiSuccess(res, {
			enabled: Boolean(Number(status.Value))
		});
	});

	/**
	 * @api {get} /bot/playsound/list Playsound - List
	 * @apiName GetPlaysoundList
	 * @apiDescription Fetches the full list of currently available playsounds
	 * @apiGroup Stream
	 * @apiPermission any
	 * @apiSuccess {number} commandCooldown Cooldown of the command itself in milliseconds
	 * @apiSuccess {Object[]} playsounds List of playsounds
	 * @apiSuccess {string} playsounds.name Playsound name to trigger
	 * @apiSuccess {string} playsounds.filename Playsound filename as it appears drive
	 * @apiSuccess {number} playsounds.cooldown Playsound coolodwn in milliseconds
	 * @apiSuccess {string} [playsounds.notes] Additional info
	 */
	Router.get("/list", async (req, res) => {
		const [playsounds, command] = await Promise.all([
			Playsound.selectAll(),
			Playsound.getCommand()
		]);

		const data = {
			commandCooldown: command.Cooldown,
			playsounds: playsounds.map(i => ({
				name: i.Name,
				filename: i.Filename,
				cooldown: i.Cooldown,
				notes: i.Notes
			}))
		};

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
