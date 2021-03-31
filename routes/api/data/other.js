module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/markov/words", async (req, res) => {
		const words = await sb.Cache.setByPrefix("markov-word-list");
		res.set("Content-Type", "text/html");
		res.send(words.join("\n"));
	});

	return Router;
})();