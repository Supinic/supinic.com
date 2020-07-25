module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../../modules/chat-data/channel");

	/**
	 * @api {get} /bot/channel/list/ Channel - list
	 * @apiName GetChannelList
	 * @apiDescription Posts a list of currently joined channels
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiSuccess {Object[]} data list of channels
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} name
	 * @apiSuccess {number} platform
	 * @apiSuccess {string} platformName
	 * @apiSuccess {string} [specificID]
	 * @apiSuccess {string} mode
	 * @apiSuccess {boolean} mention If true, will attempt to mention people when they use commands.
	 * @apiSuccess {boolean} linksAllowed If false, all links sent in channel will be replaced by placeholder.
	 * @apiSuccess {boolean} nsfw Channel's NSFW flag
	 * @apiSuccess {string} [banphraseApiType] Type of external banphrase API
	 * @apiSuccess {string} [banphraseApiUrl] URL of external banphrase API
	 * @apiSuccess {string} [banphraseApiDowntime] Determines the behaviour of bot when the ext. banphrase API is down
	 * @apiSuccess {number} [messageLimit] If set, trims messages down to this limit. If null, uses platform defaults
	 * @apiSuccess {number} [mirror] If set, all messages from this channel will be mirrored to Mirror channel
	 * @apiSuccess {string} [description]
	 * @apiSuccess {number} lineCount Amount of lines logged in this channel
	 * @apiSuccess {number} byteLength Size of this channel's logs in bytes
	 */
	Router.get("/list", async (req, res) => {
		const data = (await Channel.list()).map(i => {
			delete i.Custom_Code;
			delete i.Data;

			return i;
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();