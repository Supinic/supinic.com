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
		["other", "other.js"],
		["slots-winner", "slots-winner.js"],
		["suggestion", "suggestion.js"]
	];

	for (const [route, file] of subroutes) {
		// Just doesn't want to use the correct overload.
		// noinspection JSCheckFunctionSignatures
		Router.use(`/${route}`, require(`./${file}`));
	}

	return Router;
})();
