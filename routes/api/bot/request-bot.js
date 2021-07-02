module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../../modules/chat-data/channel.js");
	const Platform = require("../../../modules/chat-data/platform.js");
	const Suggestion = require("../../../modules/data/suggestion.js");

	Router.post("/", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return sb.WebUtils.apiFail(res, 401, "Not logged in");
		}

		const { description, platform, renamedChannel, targetChannel } = req.body;
		if (!targetChannel && !renamedChannel) {
			return sb.WebUtils.apiFail(res, 400, "No target or rename channel provided");
		}

		const platformData = await Platform.selectSingleCustom(q => q
			.where("Name = %s", platform)
		);

		if (!platformData) {
			return sb.WebUtils.apiFail(res, 404, "Provided platform has not been found");
		}

		if (renamedChannel) {
			const userData = await sb.User.get(userID);
			const previousChannel = await Channel.selectSingleCustom(q => q.where("Name = %s", renamedChannel));
			const currentChannel = await Channel.selectSingleCustom(q => q.where("Name = %s", userData.Name));

			if (!previousChannel) {
				return sb.WebUtils.apiFail(res, 400, "Provided channel has not been found");
			}
			else if (previousChannel.Name === userData.Name) {
				return sb.WebUtils.apiFail(res, 400, "When renaming, you should put in the name you used to have instead of the current one");
			}

			const currentChannelID = userData.Twitch_ID ?? await sb.Utils.getTwitchID(userData.Name);
			const previousChannelID = previousChannel.Specific_ID;
			if (currentChannelID !== previousChannelID) {
				return sb.WebUtils.apiFail(res, 400, "Renaming verification did not pass");
			}

			const renamedRow = await sb.Query.getRow("chat_data", "Channel");
			await renamedRow.load(previousChannel.ID);
			renamedRow.values.Mode = "Inactive";
			await renamedRow.save();

			const announcement = `Hello again 🙂👋 I'm back from when ${userData.Name} was called ${previousChannel.Name}.`;
			if (currentChannel) {
				await sb.Got("Supibot", {
					url: "channel/join",
					searchParams: {
						name: currentChannel.Name,
						platform: "twitch",
						announcement
					}
				});
			}
			else {
				await sb.Got("Supibot", {
					url: "channel/add",
					searchParams: {
						name: currentChannel.Name,
						platform: "twitch",
						mode: "Write",
						announcement
					}
				});
			}

			return sb.WebUtils.apiSuccess(res, {
				success: true,
				suggestionID: null
			});
		}

		const exists = await Channel.selectSingleCustom(rs => rs
			.where("Name = %s", targetChannel)
			.where("Platform = %n", platformData.ID)
		);

		if (exists) {
			if (exists.Mode === "Inactive") {
				return sb.WebUtils.apiFail(res, 400, "The bot has been removed from target channel, contact Supinic to resolve this");
			}
			else {
				return sb.WebUtils.apiFail(res, 400, "Target channel already has the bot");
			}
		}

		const twitchChannelID = await sb.Utils.getTwitchID(targetChannel);
		if (platformData.Name === "twitch" && twitchChannelID === null) {
			return sb.WebUtils.apiFail(res, 400, "Target channel does not exist on Twitch");
		}

		const userData = await sb.User.get(userID);
		if (platformData.Name === "twitch" && userData.Name !== targetChannel) {
			const escapedChannel = targetChannel.replace(/\W/g, "").toLowerCase();
			const { mods } = await sb.Got("Leppunen", `twitch/modsvips/${escapedChannel}`).json();
			const isModerator = mods.find(i => i.login === userData.Name);

			if (!isModerator) {
				return sb.WebUtils.apiFail(res, 403, "You are not a moderator in the target channel");
			}
		}

		const requestPending = await Suggestion.existsCustom(q => q
			.where("Category = %s", "Bot addition")
			.where("Status IS NULL OR Status = %s", "Approved")
			.where("Text %*like*", `Channel: ${targetChannel}`)
			.where("Text %*like*", `Platform: ${platformData.Name}`)
		);

		if (requestPending) {
			return sb.WebUtils.apiFail(res, 400, "Bot request for this channel is already pending");
		}

		let extraNotes = "";
		if (platformData.Name === "Twitch") {
			const [bttv, ffz, follows, recent] = await Promise.all([
				sb.Got({
					url: `https://api.betterttv.net/3/cached/users/twitch/${twitchChannelID}`,
					responseType: "json",
					throwHttpErrors: false
				}),
				sb.Got({
					url: `https://api.frankerfacez.com/v1/room/${targetChannel}`,
					responseType: "json",
					throwHttpErrors: false
				}),
				sb.Got("Helix", {
					url: "users/follows",
					searchParams: {
						to_id: twitchChannelID
					}
				}),
				sb.Got({
					url: `https://recent-messages.robotty.de/api/v2/recent-messages/${targetChannel}`,
					responseType: "json",
					throwHttpErrors: false,
					searchParams: {
						hide_moderation_messages: "true",
						limit: "1"
					}
				})
			]);

			const stats = [];
			if (bttv.statusCode === 200) {
				const { channelEmotes, sharedEmotes } = bttv.body;
				stats.push(`${sharedEmotes.length} shared, ${channelEmotes.length} custom BTTV emotes`);
			}
			if (ffz.statusCode === 200) {
				stats.push(`${ffz.body.sets[ffz.body.room.set].emoticons.length} FFZ emotes`);
			}
			if (follows.statusCode === 200) {
				stats.push(`${follows.body.total} followers`)
			}
			if (recent.statusCode === 200 && recent.body.messages.length !== 0) {
				const timestamp = Number(recent.body.messages[0].match(/tmi-sent-ts=(\d+)/)?.[1]);
				const delta = sb.Utils.timeDelta(new sb.Date(timestamp));

				stats.push(`last recent-message sent ${delta}`);
			}

			const list = stats.map(i => `\t${i}`).join("\n");
			extraNotes = `\nStatistics:\n${list}`;
		}

		const { insertId } = await Suggestion.insert({
			User_Alias: userData.ID,
			Text: `Channel: ${targetChannel} \nRequested by: ${userData.Name} \nPlatform: ${platformData.Name} \nDescription: ${description ?? "N/A"}${extraNotes}`,
			Category: "Bot addition",
			Status: null,
			Priority: 100,
			Notes: `Requested via website form`
		});

		return sb.WebUtils.apiSuccess(res, {
			success: true,
			suggestionID: insertId
		});
	});

	return Router;
})();
