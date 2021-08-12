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
	 * @apiParam {string} [platformName] If provided, only returns channels belonging to given platform name
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
		const platform = (req.query.platformName)
			? req.query.platformName.toLowerCase()
			: null;

		const rawData = await Channel.list();
		const data = rawData.filter(i => {
			if (i.Mode === "Read" || i.Mode === "Last seen") {
				return false;
			}
			if (!platform) {
				return true;
			}

			return (i.Platform_Name.toLowerCase() === platform);
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/channel/list/ Channel - get previous channels
	 * @apiName GetPreviousNameList
	 * @apiDescription For a given username/twitch user ID, this endpoint returns a list of all the channel rows that had the same user ID
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {string} [twitchUserID] Determines user by their Twitch user ID (exclusive with username)
	 * @apiParam {string} [username] Determines user by their Twitch user name (exclusive with twitchUserID)
	 * @apiSuccess {Object[]} data list of channels
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} name
	 * @apiSuccess {string} specificID
	 * @apiSuccess {string} mode
	 */
	Router.get("/previousList", async (req, res) => {
		const { twitchUserID, username } = req.query;
		if (!username && !twitchUserID) {
			return sb.WebUtils.apiFail(res, 400, "Either username or twitchUserID must be provided");
		}
		else if (username && twitchUserID) {
			return sb.WebUtils.apiFail(res, 400, "Only one of username and twitchUserID must be provided");
		}

		let userID = twitchUserID;
		if (username) {
			userID = await sb.Utils.getTwitchID(username);
			if (!userID) {
				return sb.WebUtils.apiFail(res, 404, "Provided username does not exist on Twitch");
			}
		}

		const data = await Channel.selectCustom(q => {
			q.select("ID", "Name", "Specific_ID", "Mode");
			q.where("Platform = %n", 1);

			if (username) {
				q.where("Name = %s OR Specific_ID = %s", username, userID);
			}
			else {
				q.where("Specific_ID = %s", userID);
			}

			return q;
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
