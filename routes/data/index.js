module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const subroutes = [
		["bad-apple", "bad-apple.js"],
		["changelog", "changelog.js"],
		["corona", "corona.js"],
		["faq", "faq.js"],
		["origin", "origin.js"],
		["other", "other.js"],
		["slots-winner", "slots-winner.js"],
		["suggestion", "suggestion.js"]
	];

	for (const [route, file] of subroutes) {
		Router.use(`/${route}`, require(`./${file}`));
	}

	return Router;
})();
