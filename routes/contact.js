module.exports = (function () {
	"use strict";
	
	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", (req, res) => {
		res.render("contact");
	});

	return Router;
})();
