module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const subroutes = [
		["channel-bots", "channel-bots.js"],
		["channel", "channel.js"],
		["command", "commands.js"],
		["cookie", "cookie.js"],
		["reminder", "reminders.js"],
		["request-bot", "request-bot.js"],
		["slots-winner", "slots-winner.js"]
	];

	Router.get("/", (req, res) => res.sendStatus(200));

	for (const [name, link] of subroutes) {
		Router.use(`/${name}`, require(`./${link}`));
	}

	return Router;
})();