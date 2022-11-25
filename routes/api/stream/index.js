const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const subroutes = [
		["recipe", "recipe.js"]
	];

	for (const [name, link] of subroutes) {
		Router.use(`/${name}`, require(`./${link}`));
	}

	return Router;
})();
