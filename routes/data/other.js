module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/markov/words", async (req, res) => {
		const words = await sb.Cache.getByPrefix("markov-word-list");
		res.set("Content-Type", "text/plain");
		res.send(words.join("\n"));
	});

	return Router;
})();