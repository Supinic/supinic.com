module.exports = (function () {
	"use strict";
	
	const Origin = require("../modules/origin.js");
	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => {
		res.render("origin", {
			data: await Origin.list()
		});
	});

	return Router;
})();