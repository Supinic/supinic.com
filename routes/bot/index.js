module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const subroutes = [
		["channel-bots", "channel-bots.js"],
		["channel", "channel.js"],
		["command", "commands.js"],
		["cookie", "cookie.js"],
		["poll", "poll.js"],
		["reminder", "reminders.js"],
		["request-bot", "request-bot.js"],
		["slots-winner", "slots-winner.js"],
		["stats", "stats.js"],
		["user", "user.js"]
	];

	for (const [route, file] of subroutes) {
		Router.use("/" + route, require("./" + file));
	}

	return Router;
})();