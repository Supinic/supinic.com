module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const subroutes = [
		["suggestion", "suggestion.js"]
	];

	subroutes.forEach(([name, link]) =>  Router.use("/" + name, require("./" + link)));

	return Router;
})();