const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const subroutes = [
		["channel-bots", "channel-bots.js"],
		["channel", "channel.js"],
		["command", "commands.js"],
		["cookie", "cookie.js"],
		["fish", "fish.js"],
		["reminder", "reminders.js"],
		["request-bot", "request-bot.js"],
		["restart", "restart.js"],
		["stats", "stats.js"],
		["twitch-auth", "twitch-auth.js"],
		["user", "user.js"]
	];

	for (const [route, file] of subroutes) {
		Router.use(`/${route}`, require(`./${file}`));
	}

	return Router;
})();
