const Express = require("express");
const Router = Express.Router();

const CustomCommandAlias = require("../../../modules/data/custom-command-alias.js");
const Channel = require("../../../modules/chat-data/channel");

module.exports = (function () {
	"use strict";


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
			return sb.WebUtils.apiFail(res, 400, "Exactly one parameter must be provided: username or twitchUserID");
		}
		else if (username && twitchUserID) {
			return sb.WebUtils.apiFail(res, 400, "Exactly one parameter must be provided: username or twitchUserID");
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

	Router.get("/detail/:id", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed channel ID");
		}

		const channelData = await Channel.selectSingleCustom(q => q
			.select("Platform.Name AS Platform_Name")
			.select("Platform.Message_Limit AS Platform_Message_Limit")
			.join("chat_data", "Platform")
			.where("Channel.ID = %n", channelID)
		);

		if (!channelData) {
			return sb.WebUtils.apiFail(res, 404, "Channel ID does not exist");
		}

		const ambassadorList = await Channel.getAmbassadorList(channelID);
		const data = {
			ID: channelData.ID,
			name: channelData.Name,
			platform: channelData.Platform_Name,
			platformID: channelData.Specific_ID,
			botMode: channelData.Mode,
			banphraseURL: channelData.Banphrase_API_URL ?? null,
			description: channelData.Description ?? null,
			ambassadorList
		};

		return sb.WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	/**
	 * @api {get} /bot/channel/detail/:ID/alias/list List channel published command aliases
	 * @apiName GetChannelCommandAliases
	 * @apiDescription For a specified channel, this endpoint lists all of its published command aliases.
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {string} includeArguments If any value is passed, the alias `arguments` body will be returned also.
	 * @apiSuccess {Object[]} alias
	 * @apiSuccess {string} alias.name
	 * @apiSuccess {string} alias.invocation Main command of the custom alias
	 * @apiSuccess {string} alias.created ISO date string
	 * @apiSuccess {string} alias.edited ISO date string
	 * @apiSuccess {string} alias.description
	 * @apiSuccess {string} alias.linkAuthor If the alias is a link to another, this is its author name
	 * @apiSuccess {string} alias.linkName If the alias is a link to another, this is the linked alias name
	 * @apiSuccess {string[]} [alias.arguments] Body of the alias as a string array. Will be omitted unless `includeArguments` is provided.
	 * @apiError (404) NotFound Channel was not found
	 */
	Router.get("/detail/:channel/alias/list", async (req, res) => {
		const channelID = Number(req.params.channel);
		if (!sb.Utils.isValidInteger(channelID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed channel ID");
		}

		const exists = await Channel.exists(channelID);
		if (!exists) {
			return sb.WebUtils.apiFail(res, 404, "Channel with provided ID does not exist");
		}

		const data = await CustomCommandAlias.fetchForUser({
			userID: channelID,
			includeArguments: true
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/channel/detail/:ID/alias/:aliasName List channel published command aliases
	 * @apiName GetChannelCommandAliasDetail
	 * @apiDescription For a specified channel and its alias name, this endpoint lists its details
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {string} includeArguments If any value is passed, the alias `arguments` body will be returned also.
	 * @apiSuccess {Object[]} alias
	 * @apiSuccess {string} alias.name
	 * @apiSuccess {string} alias.invocation Main command of the custom alias
	 * @apiSuccess {string} alias.created ISO date string
	 * @apiSuccess {string} alias.edited ISO date string
	 * @apiSuccess {string} alias.description
	 * @apiSuccess {string} alias.linkAuthor If the alias is a link to another, this is its author name
	 * @apiSuccess {string} alias.linkName If the alias is a link to another, this is the linked alias name
	 * @apiSuccess {string[]} [alias.arguments] Body of the alias as a string array. Will be omitted unless `includeArguments` is provided.
	 * @apiError (404) NotFound Channel was not found
	 */
	Router.get("/detail/:channel/alias/detail/:alias", async (req, res) => {
		const channelID = Number(req.params.channel);
		if (!sb.Utils.isValidInteger(channelID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed channel ID");
		}

		const exists = await Channel.exists(channelID);
		if (!exists) {
			return sb.WebUtils.apiFail(res, 404, "Channel with provided ID does not exist");
		}

		const data = await CustomCommandAlias.fetchForUser({
			userID: channelID,
			aliasIdentifier: req.params.alias,
			includeArguments: true
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
