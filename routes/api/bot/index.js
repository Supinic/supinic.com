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
		["song-request", "song-request.js"],
		["text-to-speech", "tts.js"]
	];

	subroutes.forEach(([name, link]) => Router.use("/" + name, require("./" + link)));

	Router.get("/active", async (req, res) => {
		return sb.WebUtils.apiDeprecated(req, res, {
			original: "/api/bot/active",
			replacement: "/api/bot-program/active",
			timestamp: new sb.Date("2020-03-31 23:59:59.999").valueOf()
		});
	});

	Router.put("/active", async (req, res) => {
		return sb.WebUtils.apiDeprecated(req, res, {
			original: "/api/bot/active",
			replacement: "/api/bot-program/active",
			timestamp: new sb.Date("2020-03-31 23:59:59.999").valueOf()
		});
	});

	return Router;
})();