const User = require("../../../modules/chat-data/user-alias");
const Filter = require("../../../modules/chat-data/filter");
const WebUtils = require("../../../utils/webutils.js");

const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const filterTypeMap = {
		block: {
			post: "block",
			delete: "unblock"
		},
		optout: {
			post: "optout",
			delete: "unoptout"
		}
	};

	const handleFilterEndpoint = async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res, { ignoreGlobalBan: true });
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const { type } = req.body;
		if (!filterTypeMap[type]) {
			return WebUtils.apiFail(res, 400, "Invalid filter type provided");
		}

		const { userData } = auth;
		const { channel, command, invocation, platform, user } = req.body;

		const args = [];
		if (channel) {
			args.push(`channel:${channel}`);
		}
		if (command) {
			args.push(`command:${command}`);
		}
		if (invocation) {
			args.push(`invocation:${invocation}`);
		}
		if (platform) {
			args.push(`platform:${platform}`);
		}
		if (user) {
			args.push(`user:${user}`);
		}

		let response;
		try {
			response = await sb.Got("Supibot", {
				url: "command/execute",
				searchParams: {
					invocation: filterTypeMap[type][req.method.toLowerCase()],
					platform: "twitch",
					channel: null,
					user: userData.Name,
					arguments: args.join(" "),
					skipGlobalBan: "true"
				}
			});
		}
		catch (e) {
			return WebUtils.apiFail(res, 504, "Could not reach internal Supibot API", {
				code: e.code,
				errorMessage: e.message
			});
		}

		const { result } = response.body.data;
		if (result.success === false) {
			return WebUtils.apiFail(res, 400, {
				reply: result.reply
			});
		}
		else {
			return WebUtils.apiSuccess(res, {
				reply: result.reply
			});
		}
	};

	/**
	 * @api {post} /bot/filter/ Create a Filter
	 * @apiName PostFilterStatus
	 * @apiDescription Creates a filter. Usable even when the authenticated user is globally banned from the service.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiParam {string} type Type of filter - "block" or "optout"
	 * @apiParam {string} command Command to block/optout form
	 * @apiParam {string} [invocation] Specific command invocation context
	 * @apiParam {string} [channel] Channel context for the filter
	 * @apiParam {string} [platform] Platform context for the filter
	 * @apiParam {string} [user] User to block - not applicable for "optout" type, mandatory for "block"
	 * @apiSuccess {string} reply
	 * @apiError (400) InvalidRequest Invalid filter type provided<br>
	 * Filter creation was not successful<br>
	 */
	Router.post("/", async (req, res) => handleFilterEndpoint(req, res));

	/**
	 * @api {delete} /bot/filter/ Deactivate Filter status
	 * @apiName DeleteFilterStatus
	 * @apiDescription Deactivates an active filter. Usable even when the authenticated user is globally banned from the service.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiParam {string} type Type of filter - "block" or "optout"
	 * @apiParam {string} command Command to block/optout form
	 * @apiParam {string} [invocation] Specific command invocation context
	 * @apiParam {string} [channel] Channel context for the filter
	 * @apiParam {string} [platform] Platform context for the filter
	 * @apiParam {string} [user] User to block - not applicable for "optout" type, mandatory for "block"
	 * @apiSuccess {string} reply
	 * @apiError (400) InvalidRequest Invalid filter type provided<br>
	 * Filter deactivation  was not successful (e.g. filter does not exist)<br>
	 */
	Router.delete("/", async (req, res) => handleFilterEndpoint(req, res));

	/**
	 * @api {get} /bot/filter/check/ Check Filter status
	 * @apiName CheckFilterStatus
	 * @apiDescription Checks if a provided user is opted out from a command
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {string} username User name - mutually exclusive with userID
	 * @apiParam {number} userID Supibot user ID - mutually exclusive with username
	 * @apiParam {string} command Supibot command name
	 * @apiSuccess {Object[]} filter List of filters
	 * @apiSuccess {string} filter.type Opt-out, Blacklist, Whitelist, Block, Unping, Unmention
	 * @apiSuccess {string} filter.response Type of response the bot responds with when the filter is encountered.
	 * @apiSuccess {string} [filter.reason] String of response
	 * @apiSuccess {string} filter.created ISO date of filter creation
	 * @apiSuccess {string} [filter.changed] ISO date of last filter change
	 * @apiError (400) InvalidRequest Neither name and id have been provided<br>
	 * Both name and id have been provided<br>
	 * id has been provided but it's not a valid ID integer<br>
	 * User for given name/id does not exist<br>
	 * Command does not exist <br>
	 */
	Router.get("/check", async (req, res) => {
		const { username, userID: rawUserID, command } = req.query;
		if ((!username && !rawUserID) || !command) {
			return WebUtils.apiFail(res, 400, "Username and command name must be provided");
		}
		else if (username && rawUserID) {
			return WebUtils.apiFail(res, 400, "Must specify exactly one of user name/id");
		}

		const userID = Number(rawUserID);
		if (rawUserID && !sb.Utils.isValidInteger(userID)) {
			return WebUtils.apiFail(res, 400, "User ID must be a valid ID integer");
		}

		let userData;
		if (username) {
			userData = await User.getByName(username);
		}
		else if (userID) {
			userData = await User.getByID(userID);
		}

		if (!userData) {
			return WebUtils.apiFail(res, 400, "User does not exist");
		}

		const rawList = await Filter.selectMultipleCustom(rs => rs
			.where("User_Alias = %n", userData.ID)
			.where("Command = %s", command)
			.where("Active = %b", true)
		);

		const filterList = rawList.map(i => ({
			Type: i.Type,
			Response: i.Response,
			Reason: i.Reason,
			Created: i.Created,
			Changed: i.Changed
		}));

		return WebUtils.apiSuccess(res, filterList);
	});

	Router.get("/channel/:id/list", async (req, res) => {
		const id = Number(req.params.id);
		if (!sb.Utils.isValidInteger(id)) {
			return WebUtils.apiFail(res, 400, "Malformed channel ID");
		}

		const data = await Filter.selectMultipleCustom(q => q
			.select("User_Alias.Name AS User_Name")
			.select("Issuer.Name AS Issuer_Name")
			.leftJoin("chat_data", "User_Alias")
			.join({
				alias: "Issuer",
				toTable: "User_Alias",
				on: "Filter.Issued_By = Issuer.ID"
			})
			.where("Channel = %n", id)
			.where("Active = %b", true)
			.where("Type = %s", "Blacklist")
		);

		return WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/filter/command/:name/list Command-related filters
	 * @apiName CheckFilterStatus
	 * @apiDescription List all filters related to a command
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {number} :name Command name as part of URL
	 * @apiSuccess {Object[]} filter List of filters
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} type
	 * @apiSuccess {number} userAlias
	 * @apiSuccess {string} username
	 * @apiSuccess {string} blockedUsername
	 * @apiSuccess {number} channel
	 * @apiSuccess {string} channelName
	 * @apiSuccess {string} platformName
	 * @apiSuccess {string} invocation
	 * @apiSuccess {string} response
	 * @apiSuccess {string} reason
	 * @apiSuccess {Object} data Custom filter data
	 * @apiError (400) Invalid Request No command name provided
	 * @apiError (404) Not Found Command does not exist
	 */
	Router.get("/command/:name/list", async (req, res) => {
		const { name } = req.params;
		if (!name) {
			return WebUtils.apiFail(res, 400, "No command provided");
		}

		let response;
		try {
			response = await sb.Got("Supibot", {
				url: "filter/command",
				searchParams: {
					command: name
				}
			});
		}
		catch (e) {
			return WebUtils.apiFail(res, 504, "Could not reach internal Supibot API", {
				code: e.code,
				errorMessage: e.message
			});
		}

		if (response.body.error) {
			return WebUtils.apiFail(res, response.statusCode, response.body.error.message);
		}
		else {
			return WebUtils.apiSuccess(res, response.body.data, { skipCaseConversion: true });
		}
	});

	/**
	 * @api {get} /bot/filter/user/list User filters
	 * @apiName CheckFilterStatus
	 * @apiDescription List all filters related to the currently logged user
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {Object[]} filter List of filters
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} type
	 * @apiSuccess {string} command
	 * @apiSuccess {number} channel
	 * @apiSuccess {string} channelName
	 * @apiSuccess {string} platformName
	 * @apiSuccess {string} invocation
	 * @apiSuccess {string} response
	 * @apiSuccess {string} reason
	 */
	Router.get("/user/list", async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const platformsData = await WebUtils.getSupibotPlatformData();
		if (!platformsData) {
			return WebUtils.apiFail(res, 504, "Could not fetch Supibot platform data");
		}

		const data = await Filter.selectCustom(q => q
			.select("Filter.ID", "Type", "Command", "Invocation", "Filter.Data")
			.select("Channel.Name AS Channel_Name", "Channel.Description AS Channel_Description", "Channel.Platform AS PlatformID")
			.select("Blocked_User.Name as Blocked_User_Name")
			.leftJoin("chat_data", "Channel")
			.leftJoin({
				alias: "Blocked_User",
				toTable: "User_Alias",
				on: "Blocked_User = Blocked_User.ID"
			})
			.where("User_Alias = %n", auth.userData.ID)
			.where("Active = %b", true)
			.where("Channel IS NULL OR Channel.Mode <> %s", "Inactive")
		);

		for (const item of data) {
			if (item.PlatformID) {
				const platformData = platformsData[item.PlatformID];
				item.Platform_Name = platformData?.name ?? null;
			}
			else {
				item.Platform_Name = null;
			}

			if (item.Data) {
				item.Data = JSON.parse(item.Data);
			}
		}

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
