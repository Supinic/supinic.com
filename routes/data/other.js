const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

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
			return res.set("Content-Type", "text/plain").send("Channel either has no Markov module configured, or there are no words available at the moment");
		}
		else if (words.length === 0) {
			return res.set("Content-Type", "text/plain").send("No words available at the moment");
		}
		else {
			return res.set("Content-Type", "text/plain").send(words.join("\n"));
		}
	});

	return Router;
})();
