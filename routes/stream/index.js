const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const subroutes = [
		["game", "game.js"],
		["tts", "tts.js"],
		["playsound", "playsound.js"],
		["song-request", "song-request.js"]
	];

	for (const [route, file] of subroutes) {
		Router.use(`/${route}`, require(`./${file}`));
	}

	return Router;
})();
