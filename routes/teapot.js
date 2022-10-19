const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	Router.get("/", (req, res) => {
		res.status(418).render("teapot");
	});

	return Router;
})();
