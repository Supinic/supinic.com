module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const subroutes = [
		["afk", "afk.js"],
		["channel", "channel.js"],
		["command", "command.js"],
		["cookie", "cookie.js"],
		["filter", "filter.js"],
		["playsound", "playsound.js"],
		["reminder", "reminder.js"],
		["request-bot", "request-bot.js"],
		["song-request", "song-request.js"],
		["text-to-speech", "tts.js"],
		["top-chatters", "top-chatters.js"],
		["user", "user-alias.js"]
	];

	for (const [name, link] of subroutes) {
		Router.use(`/${name}`, require(`./${link}`));
	}

	/**
	 * @api {get} /bot/active Channel bots data
	 * @apiName GetBotActive
	 * @apiDescription Deprecated. Use (#Bot-Program:GetBotProgramList) instead.
	 * @apiGroup Deprecated
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
		return sb.WebUtils.apiDeprecated(req, res, {
			original: "/api/bot/active",
			replacement: "/api/bot-program/bot/list",
			timestamp: new sb.Date("2020-03-31 23:59:59.999").valueOf()
		});
	});

	/**
	 * @api {put} /bot/active Set channel bot activity
	 * @apiName UpdateBotActivity
	 * @apiDescription Deprecated. Use (#Bot-Program:GetBotProgramList) instead.
	 * @apiGroup Deprecated
	 * @apiPermission login
	 * @apiSuccess {boolean} success True if everything was completed successfully
	 * @apiError (400) InvalidRequest If you authorize correctly, but you're not being tracked as a channel bot
	 * @apiError (401) Unauthorized Authorization failed
	 * @apiError (403) AccessDenied Not logged in
	 **/
	Router.put("/active", async (req, res) => {
		return sb.WebUtils.apiDeprecated(req, res, {
			original: "/api/bot/active",
			replacement: "/api/bot-program/bot/active",
			timestamp: new sb.Date("2020-03-31 23:59:59.999").valueOf()
		});
	});

	return Router;
})();