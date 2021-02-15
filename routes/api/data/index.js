module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const subroutes = [
		["bad-apple", "bad-apple.js"],
		["corona", "corona.js"],
		["faq", "faq.js"],
		["origin", "origin.js"],
		["slots-winner", "slots-winner.js"],
		["suggestion", "suggestion.js"],
		["tts", "tts.js"]
	];

	subroutes.forEach(([name, link]) =>  Router.use("/" + name, require("./" + link)));

	return Router;
})();