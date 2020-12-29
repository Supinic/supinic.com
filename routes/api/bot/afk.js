module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const AFK = require("../../../modules/chat-data/afk.js");
	const Command = require("../../../modules/chat-data/command.js");
	const Filter = require("../../../modules/chat-data/filter.js");

	/**
	 * @api {get} /bot/afk/list AFK - Get list
	 * @apiName GetAFK
	 * @apiDescription Gets the entire list of currently active AFK statuses.
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiSuccess {Object[]} status AFK status object
	 * @apiSuccess {number} status.ID Status ID
	 * @apiSuccess {number} status.userAlias
	 * @apiSuccess {string} status.started The start date of the AFK status, as an ISO string
	 * @apiSuccess {string} status.text If set, the custom message associated with the AFK status
	 * @apiSuccess {string} status.status Type of AFK status
	 * @apiSuccess {boolean} status.silent
	 */
	Router.get("/list", async (req, res) => {
		const rawData = await AFK.selectMultipleCustom(q => q.where("Active = %b", true));
		const data = rawData.map(i => ({
			ID: i.ID,
			User_Alias: i.User_Alias,
			Started: i.Started,
			Text: i.Text,
			Status: i.Status,
			Silent: Boolean(i.Silent)
		}));

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/afk/check AFK - Check user
	 * @apiName CheckAFK
	 * @apiDescription Checks if a specific user is AFK, and provides the AFK status object if they are.
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiParam {string} [username] Checks for username - mutually exclusive with `userID`
	 * @apiParam {number} [userID] Checks for user ID - mutually exclusive with `username`
	 * @apiSuccess {Object} [status] AFK status with assigned data. `null` if the user is not tracked as AFK.
	 * @apiSuccess {number} status.ID Status ID
	 * @apiSuccess {number} status.userAlias
	 * @apiSuccess {string} status.started The start date of the AFK status, as an ISO string
	 * @apiSuccess {string} status.text If set, the custom message associated with the AFK status
	 * @apiSuccess {string} status.status Type of AFK status
	 * @apiSuccess {boolean} status.silent
	 * @apiSuccess {string} status.name Username of given user
	 * @apiSuccess {string} [status.twitchID] Twitch ID
	 * @apiError (400) InvalidRequest If neither `username` nor `userID` were provided<br>
	 * If both `username` and `userID` were provided<br>
	 * If provided `username` or `userID` do not resolve to an actual user
	 */
	Router.get("/check", async (req, res) => {
		const { username, userID } = req.query;
		if (!username && !userID) {
			return sb.WebUtils.apiFail(res, 400, "No user name or ID provided");
		}
		else if (username && userID) {
			return sb.WebUtils.apiFail(res, 400, "Both user name and ID provided");
		}

		const userData = await sb.User.get(Number(userID) || username);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 400, "Provided user identifier could not be resolved");
		}

		const rawData = await AFK.selectSingleCustom(q => q
			.select("User_Alias.Name", "User_Alias.Twitch_ID")
			.where("User_Alias = %n", userData.ID)
			.where("Active = %b", true)
			.join("chat_data", "User_Alias")
		);

		return sb.WebUtils.apiSuccess(res, {
			status: (rawData)
				? {
					ID: rawData.ID,
					User_Alias: rawData.User_Alias,
					Started: rawData.Started,
					Text: rawData.Text,
					Status: rawData.Status,
					Silent: Boolean(rawData.Silent),
					Name: rawData.Name,
					Twitch_ID: rawData.Twitch_ID
				}
				: null
		});
	});

	/**
	 * @api {get} /bot/afk/checkMultiple AFK - Check multiple
	 * @apiName CheckMultipleAFK
	 * @apiDescription Checks if a specific user is AFK, and provides the AFK status object if they are.
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiParam {string} [username] Comma-separated list of usernames, mutually exclusive with `userID`
	 * @apiParam {string} [userID] Comma-separated list of usernames, mutually exclusive with `username`
	 * @apiSuccess {Status[]} results AFK statuses for queried users. Same definition as in endpoint CheckUserAFK.
	 * @apiSuccess {number} status.ID Status ID
	 * @apiSuccess {number} status.userAlias
	 * @apiSuccess {string} status.started The start date of the AFK status, as an ISO string
	 * @apiSuccess {string} status.text If set, the custom message associated with the AFK status
	 * @apiSuccess {string} status.status Type of AFK status
	 * @apiSuccess {boolean} status.silent
	 * @apiSuccess {string} status.name Username of given user
	 * @apiSuccess {string} [status.twitchID] Twitch ID
	 * @apiError (400) InvalidRequest If neither `username` nor `userID` were provided<br>
	 * If both `username` and `userID` were provided<br>
	 * If provided `username` or `userID` do not resolve to an actual user
	 */
	Router.get("/checkMultiple", async (req, res) => {
		const { username, userID } = req.query;
		if (!username && !userID) {
			return sb.WebUtils.apiFail(res, 400, "No user name or ID provided");
		}
		else if (username && userID) {
			return sb.WebUtils.apiFail(res, 400, "Both user name and ID provided");
		}

		let userList;
		if (username) {
			userList = username.split(",");
			if (userList.some(i => i.length < 2)) {
				const invalidUsernames = userList.filter(i => i.length < 2).map(i => `"${i}"`).join(",");
				return sb.WebUtils.apiFail(
					res,
					400,
					`Invalid usernames provided: ${invalidUsernames}`
				);
			}
		}
		else {
			userList = userID.split(",").map(Number);
			if (userList.some(i => !sb.Utils.isValidInteger(i))) {
				const invalidUserIDs = userList.filter(i => !sb.Utils.isValidInteger(i)).map(i => `"${i}"`).join(",");
				return sb.WebUtils.apiFail(
					res,
					400,
					`Invalid user IDs provided: ${invalidUserIDs}`
				);
			}
		}

		const userData = await sb.User.getMultiple(userList);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 400, "No proper user identifiers provided");
		}

		const data = await AFK.selectMultipleCustom(q => q
			.select("User_Alias.Name", "User_Alias.Twitch_ID")
			.where("User_Alias IN %n+", userData.map(i => i.ID))
			.where("Active = %b", true)
			.join("chat_data", "User_Alias")
		);

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {post} /bot/afk/ AFK - Post status
	 * @apiName PostAFK
	 * @apiDescription Posts an AFK status and actually sets it via Supibot.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiParam {string} [text] If set, this is the custom AFK text message. Otherwise, "(no message)" is used.
	 * @apiParam {string} [status] If set, this is the type of AFK used. If not, defaults to "afk". If set, must be one of ["afk", "brb", "food", "gn", "lurk", "poop", "shower", "work"]
	 * @apiSuccess {number} statusID If everything is successful, then this is the ID of the AFK status.
	 * @apiError (400) InvalidRequest If invalid AFK type has been provided<br>
	 * If the user is already AFK
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 */
	Router.post("/", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const command = await Command.selectSingleCustom(q => q.where("Name = %s", "afk"));
		const banCheck = await Filter.selectSingleCustom(q => q
			.where("User_Alias = %n", auth.userID)
			.where("Command = %n", command.ID)
			.where("Active = %b", true)
			.where("Type = %s", "Blacklist")
		);
		if (banCheck) {
			return sb.WebUtils.apiFail(res, 403, "You have been banned from the AFK command in at least one instance, and therefore cannot use the API to set AFK statuses");
		}

		const check = await AFK.selectSingleCustom(q => q
			.where("User_Alias = %n", auth.userID)
			.where("Active = %b", true)
		);
		if (check && check.Active) {
			return sb.WebUtils.apiFail(res, 400, "You are already AFK");
		}

		const { text, status = "afk" } = req.query;
		if (!AFK.statuses.includes(status)) {
			return sb.WebUtils.apiFail(res, 400, "Invalid AFK status provided. Available: " + AFK.statuses.join(", "));
		}

		const newStatus = await AFK.insert({
			User_Alias: auth.userID,
			Active: true,
			Text: text || "(no message)",
			Status: status,
			Started: new sb.Date(),
			Silent: false
		});

		await sb.WebUtils.invalidateBotCache({ type: "afk" });

		return sb.WebUtils.apiSuccess(res, {
			statusID: newStatus.insertId
		});
	});

	/**
	 * @api {post} /bot/afk/unset AFK - Unset status
	 * @apiName UnsetAFK
	 * @apiDescription Unsets an active AFK status for the authenticated user.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {number} statusID ID of the AFK status that was unset
	 * @apiSuccess {string} message Human-readable result
	 * @apiError (400) InvalidRequest If the user is not currently AFK
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 */
	Router.post("/unset", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const check = await AFK.selectSingleCustom(q => q
			.where("User_Alias = %n", auth.userID)
			.where("Active = %b", true)
		);
		if (!check || !check.Active) {
			return sb.WebUtils.apiFail(res, 400, "You are not AFK, and as such cannot unset the status");
		}

		await AFK.update(check.ID, { Active: false });
		await sb.WebUtils.invalidateBotCache({ type: "afk" });

		return sb.WebUtils.apiSuccess(res, {
			statusID: newStatus.insertId,
			message: "Unset successfully"
		});
	});

	return Router;
})();