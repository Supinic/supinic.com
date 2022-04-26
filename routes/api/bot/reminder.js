module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Filter = require("../../../modules/chat-data/filter.js");
	const Reminder = require("../../../modules/chat-data/reminder.js");

	const fetchReminderDetail = async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const reminderID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(reminderID)) {
			return sb.WebUtils.apiFail(res, 400, "Unprocessable reminder ID");
		}

		const row = await Reminder.getRow(reminderID);
		if (!row) {
			return sb.WebUtils.apiFail(res, 400, "Reminder ID does not exist");
		}
		else if (row.values.User_From !== auth.userID && row.values.User_To !== auth.userID) {
			return sb.WebUtils.apiFail(res, 403, "You are neither the author nor the target of the reminder");
		}

		const data = await Reminder.selectSingleCustom(q => q
			.select("Channel.Name AS Channel_Name")
			.select("Platform.Name AS Platform_Name")
			.select("Sender.Name AS Sender_Name")
			.select("Recipient.Name AS Recipient_Name")
			.where("Reminder.ID = %n", reminderID)
			.leftJoin("chat_data", "Channel")
			.leftJoin("chat_data", "Platform")
			.join({
				alias: "Sender",
				fromField: "User_From",
				toTable: "User_Alias",
				toField: "ID"
			})
			.join({
				alias: "Recipient",
				fromField: "User_To",
				toTable: "User_Alias",
				toField: "ID"
			})
		);

		return {
			success: true,
			data,
			auth,
			row,
			reminderID
		};
	};

	const fetchReminderList = async (req, res, type = "all", specific = []) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const data = await Reminder.listByUser(auth.userID, type, specific);
		return sb.WebUtils.apiSuccess(res, data);
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
	 * @apiDescription Posts a new reminder to a target user. If the reminder is timed and non-private, it will always fire in the Twitch channel of Supibot.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiParam {number} [userID] Target user's internal Supibot ID. Mutually exclusive with username.
	 * @apiParam {string} [username] Target user's name. Mutually exclusive with userID.
	 * @apiParam {string} [text] The text of the reminder itself. Can be omitted, in which case a default message will be used.
	 * @apiParam {date} [schedule] ISO string of datetime for given reminder to fire at.
	 * @apiParam {boolean} [schedule] ISO string of datetime for given reminder to fire at. Only uses Twitch channel of Supibot.
	 * @apiParam {number} [private] If true, the parameter will be sent privately. Defaults to false.
	 * @apiSuccess {number} reminderID ID of the reminder that was just created.
	 * @apiError (400) InvalidRequest If no user identifier was provided<br>
	 * If both id and name were used at the same time<br>
	 * If target user does not exist
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 * @apiError (403) Forbidden Target user has opted out from being reminded at all<br>
	 * Target user has opted out from being reminded a by you<br>
	 * You have too many pending reminders<br>
	 * Target has too many pending reminders
	 */
	Router.post("/", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const { userID, username, text, private: rawPrivateReminder, schedule: rawSchedule } = req.query;
		if (!userID && !username) {
			return sb.WebUtils.apiFail(res, 400, "No username or user ID provided");
		}
		else if (userID && username) {
			return sb.WebUtils.apiFail(res, 400, "Both username and user ID provided");
		}

		let schedule = null;
		if (rawSchedule) {
			const now = new sb.Date().addSeconds(30);
			schedule = new sb.Date(rawSchedule);

			if (!schedule) {
				return sb.WebUtils.apiFail(res, 400, "Provided schedule date is in an incorrect format");
			}
			else if (now >= schedule) {
				return sb.WebUtils.apiFail(res, 400, "Schedules must be set at least 30 seconds in the future");
			}
		}

		const privateReminder = Boolean(rawPrivateReminder);
		const userIdentifier = (userID) ? Number(userID) : username;
		const userData = await sb.User.get(userIdentifier, true);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 400, "No user matches provided identifier");
		}

		const banCheck = await Filter.selectSingleCustom(q => q
			.where("User_Alias = %n", userData.ID)
			.where("Command = %s", "remind")
			.where("Active = %b", true)
			.where("Type = %s", "Blacklist")
		);
		if (banCheck) {
			return sb.WebUtils.apiFail(res, 403, "You have been banned from the reminder command in at least one instance, and therefore cannot use the API to set reminders");
		}

		const optoutCheck = await Filter.selectSingleCustom(q => q
			.where("User_Alias = %n", userData.ID)
			.where("Command = %s", "remind")
			.where("Active = %b", true)
			.where("Type = %s", "Opt-out")
		);
		if (optoutCheck) {
			return sb.WebUtils.apiFail(res, 403, "Target user opted out from reminders");
		}

		const blockCheck = await Filter.selectSingleCustom(q => q
			.where("User_Alias = %n", userData.ID)
			.where("Blocked_User = %n", auth.userID)
			.where("Command = %s", "remind")
			.where("Active = %b", true)
			.where("Type = %s", "Block")
		);
		if (blockCheck) {
			return sb.WebUtils.apiFail(res, 403, "Target user has blocked you from reminding them");
		}

		const { success, cause } = await sb.Reminder.checkLimits(auth.userID, userData.ID, schedule);
		if (!success) {
			return sb.WebUtils.apiFail(res, 403, cause);
		}

		const platformID = (schedule || privateReminder) ? 1 : null;
		const targetChannelID = (schedule && !privateReminder) ? 37 : null;
		const newReminder = await Reminder.insertCustom({
			User_From: auth.userID,
			User_To: userData.ID,
			Channel: targetChannelID,
			Platform: platformID,
			Schedule: schedule ?? null,
			Text: text || "(no message)",
			Active: true,
			Private_Message: privateReminder
		});

		await sb.Got("Supibot", {
			url: "reminder/reloadSpecific",
			searchParams: {
				ID: newReminder.insertId
			}
		});

		const ID = newReminder.insertId;
		const { body, statusCode } = await sb.Got("Supibot", {
			url: "reminder/reloadSpecific",
			searchParams: { ID }
		});

		if (statusCode !== 200 || !body.data.active.includes(ID)) {
			return sb.WebUtils.apiSuccess(res, {
				reminderID: ID,
				botResult: body,
				message: "Warning - reminder created successfully, but bot failed to reload reminders"
			});
		}
		else {
			return sb.WebUtils.apiSuccess(res, {
				reminderID: ID
			});
		}
	});

	Router.get("/lookup", async (req, res) => {
		const { ID } = req.query;
		if (!ID) {
			return sb.WebUtils.apiSuccess(res, []);
		}

		const numberIDs = (typeof ID === "string")
			? ID.split(",").map(Number)
			: ID.map(Number);

		if (numberIDs.some(i => !sb.Utils.isValidInteger(i))) {
			return sb.WebUtils.apiFail(res, 400, "One or more invalid IDs requested");
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

		const { data } = check;
		return sb.WebUtils.apiSuccess(res, ({
			ID: data.ID,
			Sender: data.Sender_Name,
			Recipient: data.Recipient_Name,
			Channel_ID: data.Channel,
			Channel: data.Channel_Name,
			Platform: data.Platform_Name,
			Text: data.Text,
			Created: data.Created,
			Schedule: data.Schedule,
			Active: data.Active,
			Private_Message: data.Private_Message
		}));
	});

	/**
	 * @api {delete} /bot/reminder/<id> Reminder - unset
	 * @apiName UnsetReminder
	 * @apiDescription Unsets a reminder
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {number} reminderID ID of the reminder that was created
	 * @apiSuccess {string} message Human readable result of the operation
	 * @apiError (400) InvalidRequest If no user identifier was provided<br>
	 * If both id and name were used at the same time<br>
	 * If target user does not exist
	 * If the reminder has already been unset
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 */
	Router.delete("/:id", async (req, res) => {
		const check = await fetchReminderDetail(req, res);
		if (!check.success) {
			return check;
		}

		const { reminderID: ID, row } = check;
		if (row.values.Active === false) {
			return sb.WebUtils.apiFail(res, 400, "Reminder has been unset already");
		}

		row.values.Active = false;
		row.values.Cancelled = true;
		await row.save();

		const { body, statusCode } = await sb.Got("Supibot", {
			url: "reminder/reloadSpecific",
			searchParams: { ID }
		});

		if (statusCode !== 200) {
			return sb.WebUtils.apiSuccess(res, {
				reminderID: ID,
				botResult: body,
				message: "Reminder unset successfully - but the bot failed to reload"
			});
		}
		else {
			return sb.WebUtils.apiSuccess(res, {
				reminderID: ID,
				botResult: body,
				message: "Reminder unset successfully"
			});
		}
	});

	return Router;
})();
