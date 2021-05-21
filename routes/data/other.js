module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/markov/:channelID/words", async (req, res) => {
		const channelID = Number(req.params.channelID);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Invalid channel ID"
			});
		}

		const words = await sb.Cache.getByPrefix("markov-word-list", {
			keys: { channelID }
		});

		if (!words) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Channel does not have any Markov module configured"
			});
		}
		else if (words.length === 0) {
			return res.set("Content-Type", "text/plain").send("No words available");
		}
		else {
			return res.set("Content-Type", "text/plain").send(words.join("\n"));
		}
	});w

	return Router;
})();