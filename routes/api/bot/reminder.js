const Express = require("express");
const Router = Express.Router();

const Reminder = require("../../../modules/chat-data/reminder.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const fetchReminderDetail = async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const reminderID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(reminderID)) {
			return WebUtils.apiFail(res, 400, "Unprocessable reminder ID");
		}

		const { data, table, row } = await Reminder.getDetail(reminderID);
		if (!row) {
			return WebUtils.apiFail(res, 400, "Reminder ID does not exist");
		}
		else if (row.values.User_From !== auth.userID && row.values.User_To !== auth.userID) {
			return WebUtils.apiFail(res, 403, "You are neither the author nor the target of the reminder");
		}

		if (typeof data.Text === "string") {
			data.Text = sb.Utils.escapeHTML(data.Text);
		}

		return {
			success: true,
			table,
			data,
			auth,
			row,
			reminderID
		};
	};

	const fetchReminderList = async (req, res, type, specificIds = []) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		let data;
		if (type === "active" || type === "inactive") {
			data = await Reminder.listByUser(auth.userID, type);
		}
		else if (type === "specific") {
			data = await Reminder.getSpecificForUser(auth.userID, specificIds);
		}
		else {
			throw new sb.Error({
				message: "Incorrect reminder list type provided",
				args: { type }
			});
		}

		return WebUtils.apiSuccess(res, data);
	};

	/**
	 * @api {get} /bot/reminder/list Reminder - list active
	 * @apiName ListActiveReminders
	 * @apiDescription Gets the list of all active reminders for the authorized user.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {Object[]} reminder AFK status object
	 * @apiSuccess {number} reminder.ID Status ID
	 * @apiSuccess {number} reminder.userFrom Author user ID
	 * @apiSuccess {string} reminder.author Author user name
	 * @apiSuccess {number} reminder.userTo Target user ID
	 * @apiSuccess {number} reminder.target Target user namer
	 * @apiSuccess {number} [reminder.channel] The channel, where the reminder was set up (null if PM'd, or set by API)
	 * @apiSuccess {string} [reminder.channelName] Channel name
	 * @apiSuccess {number} [reminder.platform] The platfomr of reminder origin (null if set by API)
	 * @apiSuccess {string} reminder.text The text of reminder itself
	 * @apiSuccess {string} reminder.created Datetime of reminder creation
	 * @apiSuccess {string} [reminder.schedule] If scheduled (timed), this is the datetime of reminder trigger
	 * @apiSuccess {boolean} reminder.active Whether or not the reminder is currently active
	 * @apiSuccess {boolean} reminder.privateMessage Whether or not the reminder will be PM'd to the target user
	 */
	Router.get("/list", async (req, res) => await fetchReminderList(req, res, "active"));

	/**
	 * @api {get} /bot/reminder/list Reminder - list active
	 * @apiName ListActiveReminders
	 * @apiDescription Gets the list of all active reminders for the authorized user.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {Object[]} reminder AFK status object
	 * @apiSuccess {number} reminder.ID Status ID
	 * @apiSuccess {number} reminder.userFrom Author user's internal Supibot ID
	 * @apiSuccess {string} reminder.author Author user name
	 * @apiSuccess {number} reminder.userTo Target user's internal Supibot ID
	 * @apiSuccess {number} reminder.target Target user name
	 * @apiSuccess {number} [reminder.channel] The channel, where the reminder was set up (null if PM'd, or set by API)
	 * @apiSuccess {string} [reminder.channelName] Channel name
	 * @apiSuccess {number} [reminder.platform] The platfomr of reminder origin (null if set by API)
	 * @apiSuccess {string} reminder.text The text of reminder itself
	 * @apiSuccess {string} reminder.created Datetime of reminder creation
	 * @apiSuccess {string} [reminder.schedule] If scheduled (timed), this is the datetime of reminder trigger
	 * @apiSuccess {boolean} reminder.active Whether or not the reminder is currently active
	 * @apiSuccess {boolean} reminder.privateMessage Whether or not the reminder will be PM'd to the target user
	 */
	Router.get("/history", async (req, res) => await fetchReminderList(req, res, "inactive"));

	/**
	 * @api {post} /bot/reminder/ Reminder - create
	 * @apiName CreateReminder
	 * @apiDescription Posts a new reminder to a target user. The reminders are created as if whispered to Supibot on Twitch.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiParam {string} username Target user's name.
	 * @apiParam {string} [text] The text of the reminder itself. Can be omitted, in which case a default message will be used.
	 * @apiParam {string} [schedule] Schedule string as used in Supibot, e.g. "4 days" to schedule a reminder in 4 days. Also supports date-based queries. Note: Can only be used to remind yourself, not other users.
	 * @apiParam {number} [private] If provided (any value), the reminder will be sent privately. Defaults to `false` for reminders targetted at others, `true` for self reminders.
	 * @apiSuccess {string} reply The resulting command string, as if executing within the bot.
	 * @apiError (400) InvalidRequest If no user identifier was provided<br>
	 * If the proxied command fails in any other way as described in Supibot
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 */
	Router.post("/", async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const { username } = req.query;
		if (!username) {
			return WebUtils.apiFail(res, 400, "No target username provided");
		}
		else if (/\s+/.test(username)) {
			return WebUtils.apiFail(res, 400, "Malformed username provided - whitespace is not allowed");
		}

		const reminderText = req.query.text ?? "";
		const privateParameter = (req.query.private) ? "private:true" : "";
		const scheduleText = (req.query.schedule) ? `on:"${req.query.schedule}"` : "";

		const data = await WebUtils.executeSupibotRequest(res, "command/execute", {
			invocation: "remind",
			platform: "twitch",
			channel: null,
			user: auth.userData.Name,
			arguments: `${username} ${reminderText} ${privateParameter} ${scheduleText}`.trim(),
			skipGlobalBan: "false"
		});

		return WebUtils.apiSuccess(res, data);
	});

	Router.get("/lookup", async (req, res) => {
		const { ID } = req.query;
		if (!ID) {
			return WebUtils.apiSuccess(res, []);
		}

		const numberIDs = (typeof ID === "string")
			? ID.split(",").map(Number)
			: ID.map(Number);

		if (numberIDs.some(i => !sb.Utils.isValidInteger(i))) {
			return WebUtils.apiFail(res, 400, "One or more invalid IDs requested");
		}

		return await fetchReminderList(req, res, "specific", numberIDs);
	});

	/**
	 * @api {get} /bot/reminder/<id> Reminder - check
	 * @apiName GetReminder
	 * @apiDescription Gets reminder detail data
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} sender
	 * @apiSuccess {string} recipient
	 * @apiSuccess {string} [channel]
	 * @apiSuccess {number} [channelID]
	 * @apiSuccess {string} [platform]
	 * @apiSuccess {string} [text]
	 * @apiSuccess {date} created
	 * @apiSuccess {date} [schedule]
	 * @apiSuccess {boolean} active
	 * @apiSuccess {boolean} privateMessage
	 * @apiError (400) InvalidRequest If no user identifier was provided<br>
	 * If both id and name were used at the same time<br>
	 * If target user does not exist
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 */
	Router.get("/:id", async (req, res) => {
		const check = await fetchReminderDetail(req, res);
		if (!check.success) {
			return check;
		}

		const { data, table } = check;
		return WebUtils.apiSuccess(res, ({
			ID: data.ID,
			Sender: data.Sender_Name,
			Recipient: data.Recipient_Name,
			Channel_ID: data.Channel,
			Channel: data.Channel_Name,
			Platform: data.Platform_Name,
			Text: data.Text,
			Type: data.Type,
			Created: data.Created,
			Schedule: data.Schedule,
			Active: (table === "Reminder"),
			Private_Message: data.Private_Message
		}));
	});

	/**
	 * @api {delete} /bot/reminder/<id> Reminder - unset
	 * @apiName UnsetReminder
	 * @apiDescription Unsets a reminder
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {string} message Human readable result of the operation
	 * @apiError (400) InvalidRequest If no user identifier was provided<br>
	 * If both id and name were used at the same time<br>
	 * If target user does not exist
	 * If the reminder has already been unset
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 */
	Router.delete("/:id", async (req, res) => {
		const reminderID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(reminderID)) {
			return WebUtils.apiFail(res, 400, "Unprocessable reminder ID");
		}

		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		return await WebUtils.executeSupibotRequest(res, "reminder/unset", {
			user: auth.userData.Name,
			id: reminderID
		});
	});

	return Router;
})();
