const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const subroutes = [
		["bad-apple", "bad-apple.js"],
		["changelog", "changelog.js"],
		["dall-e", "dall-e.js"],
		["faq", "faq.js"],
		["origin", "origin.js"],
		["slots-winner", "slots-winner.js"],
		["suggestion", "suggestion.js"],
		["tts", "tts.js"]
	];

	for (const [name, link] of subroutes) {
		Router.use(`/${name}`, require(`./${link}`));
	}

	return Router;
})();
