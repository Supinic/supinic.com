module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Filter = require("../../../modules/chat-data/filter");

	/**
	 * @api {get} /bot/filter/check/ Check Filter status
	 * @apiName CheckFilterStatus
	 * @apiDescription Checks if a provided user is opted out from a command
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {string} username User name - mutually exclusive with userID
	 * @apiParam {number} userID Supibot user ID - mutually exclusive with username
	 * @apiParam {number} commandID Supibot command ID
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
		const { username, userID: rawUserID, commandID: rawCommandID } = req.query;
		if ((!username && !rawUserID) || !rawCommandID) {
			return sb.WebUtils.apiFail(res, 400, "Username and command ID must be provided");
		}
		else if (username && rawUserID) {
			return sb.WebUtils.apiFail(res, 400, "Must specify exactly one of user name/id");
		}

		const userID = Number(rawUserID);
		if (rawUserID && !sb.Utils.isValidInteger(userID)) {
			return sb.WebUtils.apiFail(res, 400, "User ID must be a valid ID integer");
		}

		const userData = await sb.User.get(username || userID);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 400, "User does not exist");
		}

		const commandID = Number(rawCommandID);
		if (rawCommandID && !sb.Utils.isValidInteger(commandID)) {
			return sb.WebUtils.apiFail(res, 400, "Command ID must be a valid ID integer");
		}

		const filterList = (await Filter.selectMultipleCustom(rs => rs
			.where("User_Alias = %n", userData.ID)
			.where("Command = %n", commandID)
			.where("Active = %b", true)
		)).map(i => ({
			Type: i.Type,
			Response: i.Response,
			Reason: i.Reason,
			Created: i.Created,
			Changed: i.Changed
		}));

		return sb.WebUtils.apiSuccess(res, filterList);
	});

	Router.get("/channel/:id/list", async (req, res) => {
		const id = Number(req.params.id);
		if (!sb.Utils.isValidInteger(id)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed channel ID");
		}

		const data = await Filter.selectMultipleCustom(q => q
			.select("Command.Name AS Command_Name")
			.select("User_Alias.Name AS User_Name")
			.leftJoin("chat_data", "Command")
			.leftJoin("chat_data", "User_Alias")
			.where("Channel = %n", id)
			.where("Active = %b", true)
			.where("Type = %s", "Blacklist")
		);

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/filter/command/:id/list Command-related filters
	 * @apiName CheckFilterStatus
	 * @apiDescription List all filters related to a command
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {number} :id Command ID as part of URL
	 * @apiSuccess {Object[]} filter List of filters
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} type
	 * @apiSuccess {number} userAlias
	 * @apiSuccess {string} username
	 * @apiSuccess {number} channel
	 * @apiSuccess {string} channelName
	 * @apiSuccess {string} platformName
	 * @apiSuccess {string} invocation
	 * @apiSuccess {string} response
	 * @apiSuccess {string} reason
	 * @apiSuccess {Object} data Custom filter data
	 * @apiError (400) InvalidRequest Command does not exist
	 */
	Router.get("/command/:id/list", async (req, res) => {
		const id = Number(req.params.id);
		if (!sb.Utils.isValidInteger(id)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed command ID");
		}

		const data = await Filter.selectCustom(q => q
			.select("Filter.ID", "Type", "User_Alias", "Channel", "Invocation", "Response", "Reason", "Data")
			.select("Channel.Name AS Channel_Name", "Channel.Description AS Channel_Description")
			.select("User_Alias.Name AS Username")
			.select("Platform.Name AS Platform_Name")
			.leftJoin("chat_data", "Channel")
			.leftJoin("chat_data", "User_Alias")
			.leftJoin({
				toTable: "Platform",
				on: "Channel.Platform = Platform.ID"
			})
			.where("Command = %n", id)
			.where("Active = %b", true)
			.where("Type NOT IN %s+", ["Block", "Unping"])
			.where("Channel IS NULL OR Channel.Mode <> %s", "Inactive")
		);

		for (const item of data) {
			if (item.Data) {
				item.Data = JSON.parse(item.Data);
			}
		}

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
