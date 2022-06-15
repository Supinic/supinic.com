module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/detail/:id", async (req, res) => {
		res.render("dall-e-display", {
			id: req.params.id,
			title: "DALL-E images"
		});
	});

	return Router;
})();
