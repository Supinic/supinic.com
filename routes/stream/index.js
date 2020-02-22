module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const subroutes = [
		["tts", "tts.js"],
		["playsound", "playsound.js"],
		["video-queue", "video-queue.js"]
	];

	subroutes.forEach(([name, link]) => Router.use("/" + name, require("./" + link)));

	return Router;
})();