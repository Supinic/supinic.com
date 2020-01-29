/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => {
		const data = sb.Config.get("TTS_VOICE_DATA");
		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 50
		});
	});

	return Router;
})();
