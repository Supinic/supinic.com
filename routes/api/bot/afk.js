module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const AFK = require("../../../modules/chat-data/afk.js");
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

	Router.get("/checkMultiple", async (req, res) => {
		return sb.WebUtils.apiFail(res, 410, "Endpoint removed, use api/bot/afk/check");
	});

	/**
	 * @api {post} /bot/afk/ AFK - Post status
	 * @apiName PostAFK
	 * @apiDescription Posts an AFK status and actually sets it via Supibot.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiParam {string} [text] If set, this is the custom AFK text message. Otherwise, "(no message)" is used.
	 * @apiSuccess {strimg} response Command response
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

		let response;
		try {
			response = await sb.Got("Supibot", {
				url: "command/execute",
				searchParams: {
					invocation: "afk",
					platform: "twitch",
					channel: null,
					user: auth.userData.Name,
					arguments: req.params.text.join(" "),
				}
			});
		}
		catch (e) {
			return sb.WebUtils.apiFail(res, 504, "Could not reach internal Supibot API", {
				code: e.code,
				errorMessage: e.message
			});
		}

		const { data, error } = response.body;
		if (!data || response.statusCode !== 200) {
			return sb.WebUtils.apiFail(res, response.statusCode, {
				reply: error?.message
			});
		}

		const { result } = data;
		if (result.success === false) {
			return sb.WebUtils.apiFail(res, 400, {
				reply: result.reply
			});
		}
		else {
			return sb.WebUtils.apiSuccess(res, {
				reply: result.reply
			});
		}
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
		await sb.Got("Supibot", {
			url: "afk/reloadSpecific",
			searchParams: {
				ID: check.ID
			}
		});

		return sb.WebUtils.apiSuccess(res, {
			statusID: check.ID,
			message: "Unset successfully"
		});
	});

	return Router;
})();
