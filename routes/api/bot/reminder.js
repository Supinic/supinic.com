module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Command = require("../../../modules/chat-data/command.js");
	const Filter = require("../../../modules/chat-data/filter.js");
	const Reminder = require("../../../modules/chat-data/reminder.js");

	const reloadBotReminders = async () => {
		const params = new sb.URLParams().set("type", "reload").set("module", "reminder");
		await sb.InternalRequest.send(params);
	};

	/**
	 * @api {get} /bot/reminder/list Reminder - list
	 * @apiName ListReminders
	 * @apiDescription Gets the list of all reminders.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {Object[]} reminder AFK status object
	 * @apiSuccess {number} reminder.ID Status ID
	 * @apiSuccess {number} reminder.userFrom Author user of the reminder
	 * @apiSuccess {number} reminder.userTo Target user of the reminder
	 * @apiSuccess {number} [reminder.channel] The channel, where the reminder was set up (null if PM'd, or set by API)
	 * @apiSuccess {number} [reminder.platform] The platfomr of reminder origin (null if set by API)
	 * @apiSuccess {string} reminder.text The text of reminder itself
	 * @apiSuccess {string} reminder.created Datetime of reminder creation
	 * @apiSuccess {string} [reminder.schedule] If scheduled (timed), this is the datetime of reminder trigger
	 * @apiSuccess {boolean} reminder.active Whether or not the reminder is currently active
	 * @apiSuccess {boolean} reminder.privateMessage Whether or not the reminder will be PM'd to the target user
	 */
	Router.get("/list", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, 401, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const data = await Reminder.selectMultipleCustom(q => q
			.where("User_From = %n OR User_To = %n", auth.userID, auth.userID)
			.where("Active = %b", true)
		);

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {post} /bot/reminder/ Reminder - create
	 * @apiName CreateReminder
	 * @apiDescription Posts a new reminder to a target user. If the reminder is timed and non-private, it will always fire in the Twitch channel of Supibot.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiParam {number} [userID] Target user's ID. Mutually exclusive with username.
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
			return sb.WebUtils.apiFail(res, 401, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const {userID, username, text, private: rawPrivateReminder, schedule: rawSchedule} = req.query;
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

		const command = await Command.selectSingleCustom(q => q.where("Name = %s", "remind"));
		const optoutCheck = await Filter.selectSingleCustom(q => q
			.where("User_Alias = %n", userData.ID)
			.where("Command = %n", command.ID)
			.where("Active = %b", true)
			.where("Type = %s", "Opt-out")
		);
		if (optoutCheck) {
			return sb.WebUtils.apiFail(res, 403, "Target user opted out from reminders");
		}

		const blockCheck = await Filter.selectSingleCustom(q => q
			.where("User_Alias = %n", userData.ID)
			.where("Blocked_User = %n", auth.userID)
			.where("Command = %n", command.ID)
			.where("Active = %b", true)
			.where("Type = %s", "Block")
		);
		if (blockCheck) {
			return sb.WebUtils.apiFail(res, 403, "Target user has blocked you from reminding them");
		}

		const countCheckFrom = (await sb.Query.getRecordset(rs => rs
			.select("COUNT(*) AS Count")
			.from("chat_data", "Reminder")
			.where("Active = %b", true)
			.where("Schedule IS NULL")
			.where("User_From = %n", auth.userID)
			.single()
		));

		const countCheckTo = (await sb.Query.getRecordset(rs => rs
			.select("COUNT(*) AS Count")
			.from("chat_data", "Reminder")
			.where("Active = %b", true)
			.where("Schedule IS NULL")
			.where("User_To = %n", userData.ID)
			.single()
		));

		if (countCheckFrom && countCheckFrom.Count >= sb.Config.get("MAX_ACTIVE_REMINDERS") * 2) {
			return sb.WebUtils.apiFail(res, 403, "You have too many pending reminders");
		}
		else if (countCheckTo && countCheckTo.Count >= sb.Config.get("MAX_ACTIVE_REMINDERS")) {
			return sb.WebUtils.apiFail(res, 403, "Target user has too many pending reminders");
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
			Private_Message: false
		});

		await reloadBotReminders();

		return sb.WebUtils.apiSuccess(res, {
			reminderID: newReminder.insertId
		});
	});

	/**
	 * @api {post} /bot/reminder/<id> Reminder - unset
	 * @apiName UnsetReminder
	 * @apiDescription Unsets a reminder
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {number} reminderID ID of the reminder that was created
	 * @apiSuccess {string} message Human readable result of the operation
	 * @apiError (400) InvalidRequest If no user identifier was provided<br>
	 * If both id and name were used at the same time<br>
	 * If target user does not exist
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 */
	Router.delete("/:id", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, 401, auth.error);
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
			return sb.WebUtils.apiFail(res, 403, "Reminder was not created by you and you aren't its target");
		}
		else if (!row.values.Active) {
			return sb.WebUtils.apiFail(res, 400, "Reminder is not active");
		}

		row.values.Active = false;
		await row.save();

		await reloadBotReminders();

		return sb.WebUtils.apiSuccess(res, {
			reminderID: reminderID,
			message: "Reminder unset successfully"
		});
	});

	return Router;
})();
