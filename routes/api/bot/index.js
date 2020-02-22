module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const ChannelBot = require("../../../modules/bot-data/bot.js");

	const subroutes = [
		["afk", "afk.js"],
		["channel", "channel.js"],
		["command", "command.js"],
		["cookie", "cookie.js"],
		["filter", "filter.js"],
		["playsound", "playsound.js"],
		["reminder", "reminder.js"],
		["song-request", "song-request.js"],
		["text-to-speech", "tts.js"]
	];

	subroutes.forEach(([name, link]) => Router.use("/" + name, require("./" + link)));

	/**
	 * @api {get} /bot/active Channel bots data
	 * @apiName GetBotActive
	 * @apiDescription Fetches all the relevant data for channel bots
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiSuccess {number} id Bot's internal ID
	 * @apiSuccess {string} name Bot's name
	 * @apiSuccess {string} [prefix] Bot's command prefix. Can be null, if none is used (no commands) or unknown
	 * @apiSuccess {string} [author] Author's ID. Can be null if unknown
	 * @apiSuccess {string} [language] Programming language use to implement the bot. Can be null if unknown.
	 * @apiSuccess {string} [description] Voluntary description
	 * @apiSuccess {string} [lastSeen] If the bot verifies, this is the date of last verification - as ISO string
	 * @apiSuccess {number} [lastSeenTimestamp] If the bot verifies, this is the date of last verification - as timestamp
	 **/
	Router.get("/active", async (req, res) => {
		const rawData = await ChannelBot.selectMultipleCustom(q => q
			.select("Bot_User_Alias.Name AS Bot_Name")
			.select("GROUP_CONCAT(Badge.Name SEPARATOR ',') AS Badges")
			.join({
				alias: "Bot_User_Alias",
				toDatabase: "chat_data",
				toTable: "User_Alias",
				on: "Bot.Bot_Alias = Bot_User_Alias.ID"
			})
			.leftJoin({
				toDatabase: "bot_data",
				toTable: "Bot_Badge",
				on: "Bot_Badge.Bot = Bot.Bot_Alias"
			})
			.leftJoin({
				toDatabase: "bot_data",
				toTable: "Badge",
				on: "Bot_Badge.Badge = Badge.ID"
			})
			.groupBy("Bot.Bot_Alias")
		);

		const data = rawData.map(i => ({
			id: i.Bot_Alias,
			name: i.Bot_Name,
			prefix: i.Prefix,
			author: i.Author,
			language: i.Language,
			description: i.Description,
			level: i.Level,
			last_seen: (i.Last_Verified)
				? i.Last_Verified.sqlDateTime()
				: null,
			last_seen_timestamp: (i.Last_Verified)
				? i.Last_Verified.valueOf()
				: null,
			badges: (i.Badges)
				? i.Badges.split(",")
				: []
		}));

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {put} /bot/active Set channel bot activity
	 * @apiName PutBotActive
	 * @apiDescription Updates the "Last Active" column of a Channel Bot. This is used to summarize channel bots being online and active.
	 * @apiGroup Bot
	 * @apiPermission login
	 * @apiSuccess {boolean} success True if everything was completed successfully
	 * @apiError (400) InvalidRequest If you authorize correctly, but you're not being tracked as a channel bot
	 * @apiError (401) Unauthorized Authorization failed
	 * @apiError (403) AccessDenied Not logged in
	**/
	Router.put("/active", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, 401, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const botData = await sb.User.get(auth.userID);
		const exists = await ChannelBot.existsCustom(q => q
			.where("Bot_Alias = %n", botData.ID)
		);
		if (!exists) {
			return sb.WebUtils.apiFail(res, 400, "You are not being tracked as a bot");
		}

		await ChannelBot.updateCustom(
			{ Last_Verified: new sb.Date() },
			q => q.where("Bot_Alias = %n", botData.ID)
		);

		return sb.WebUtils.apiSuccess(res, { success: true });
	});

	return Router;
})();