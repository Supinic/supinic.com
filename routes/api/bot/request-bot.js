/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../../modules/chat-data/channel.js");
	const Suggestion = require("../../../modules/data/suggestion.js");

	Router.post("/", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return sb.WebUtils.apiFail(res, 401, "Not logged in");
		}

		const { description, targetChannel } = req.body;
		if (!targetChannel) {
			return sb.WebUtils.apiFail(res, 400, "No target channel provided");
		}

		const exists = await Channel.selectSingleCustom(rs => rs
			.where("Name = %s", targetChannel)
			.where("Platform = %n", 1)
		);

		if (exists) {
			return sb.WebUtils.apiFail(res, 400, "Target channel already has the bot");
		}
		else if (await sb.Utils.getTwitchID(targetChannel) === null) {
			return sb.WebUtils.apiFail(res, 400, "Target channel does not exist on Twitch");
		}

		const userData = await sb.User.get(userID);
		if (userData.Name !== targetChannel) {
			const escapedChannel = targetChannel.replace(/\W/g, "").toLowerCase();
			const { mods } = await sb.Got.instances.Leppunen("twitch/modsvips/" + escapedChannel).json();
			const isModerator = mods.find(i => i.login === escapedChannel);

			if (!isModerator) {
				return sb.WebUtils.apiFail(res, 403, "You are not a moderator in the target channel");
			}
		}

		const { insertId } = await Suggestion.insert({
			User_Alias: userData.ID,
			Category: "Bot addition",
			Notes: "Requested via website",
			Text: `Channel: ${targetChannel}, requested by: ${userData.Name}, description: ${description ?? "N/A"}`
		});

		return sb.WebUtils.apiSuccess(res, {
			success: true,
			suggestionID: insertId
		});
	});

	return Router;
})();