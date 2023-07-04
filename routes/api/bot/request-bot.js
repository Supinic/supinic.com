const Express = require("express");
const Router = Express.Router();

const Channel = require("../../../modules/chat-data/channel.js");
const Platform = require("../../../modules/chat-data/platform.js");
const Suggestion = require("../../../modules/data/suggestion.js");
const User = require("../../../modules/chat-data/user-alias.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.post("/", async (req, res) => {
		const { userID } = await WebUtils.getUserLevel(req, res);
		if (!userID) {
			return WebUtils.apiFail(res, 401, "Not logged in");
		}

		const { description, platform, renamedChannel, targetChannel } = req.body;
		if (!targetChannel && !renamedChannel) {
			return WebUtils.apiFail(res, 400, "No target or rename channel provided");
		}

		const platformData = await Platform.selectSingleCustom(q => q
			.where("Name = %s", platform)
		);

		if (!platformData) {
			return WebUtils.apiFail(res, 404, "Provided platform has not been found");
		}

		if (platformData.Name ===  "twitch") {
			const helixChannelResponse = await sb.Got("Helix", {
				url: "users",
				searchParams: {
					login: targetChannel
				},
			});

			const currentChannelID = helixChannelResponse.body.data?.[0].id;
			if (currentChannelID) {
				const previousChannelName = await sb.Query.getRecordset(rs => rs
					.select("Name")
					.from("chat_data", "Channel")
					.where("Name <> %s", targetChannel)
					.where("Platform = %n", 1)
					.where("Specific_ID = %s", currentChannelID)
					.orderBy("ID DESC")
					.flat("Name")
					.single()
				);

				console.log("Bot request rename check", {
					targetChannel,
					currentChannelID,
					previousChannelName
				});

				if (previousChannelName) {
					const response = await sb.Got("Supibot", {
						url: "command/execute",
						searchParams: {
							invocation: "bot",
							platform: "twitch",
							channel: null,
							user: targetChannel,
							arguments: `rename channel:"${previousChannelName}"`
						}
					});

					console.log("Bot proxy API result", { body: response.body });

					if (response.ok) {
						return WebUtils.apiSuccess(res, {
							success: true,
							suggestionID: null,
							rename: "success"
						});
					}
					else {
						return WebUtils.apiFail(res, 500, {
							success: true,
							suggestionID: null,
							rename: "success"
						});
					}
				}
			}
		}

		const exists = await Channel.selectSingleCustom(rs => rs
			.where("Name = %s", targetChannel)
			.where("Platform = %n", platformData.ID)
		);

		if (exists) {
			if (exists.Mode === "Inactive") {
				const inactiveReason = await sb.Query.getRecordset(rs => rs
					.select("Value")
					.from("chat_data", "Channel_Data")
					.where("Channel = %n", exists.ID)
					.where("Property = %s", "inactive-reason")
				);

				if (inactiveReason === "channel-inactive") {
					return WebUtils.apiFail(res, 409, sb.Utils.tag.trim `
						The bot has been removed from target channel because of prolonged inactivity.
						You can immediately receive the bot back by using this command →
						$bot rejoin channel:"${targetChannel}"
					`);
				}

				return WebUtils.apiFail(
					res,
					409,
					`The bot has been removed from target channel, reason: ${inactiveReason ?? "unknown"}`
				);
			}
			else {
				return WebUtils.apiFail(res, 400, "Target channel already has the bot");
			}
		}

		let twitchChannelID;
		if (platformData.Name === "Twitch") {
			const helixUserResponse = await sb.Got("Helix", {
				url: "users",
				searchParams: {
					login: targetChannel
				},
			});

			twitchChannelID = helixUserResponse.body.data?.[0].id;

			if (!twitchChannelID) {
				return WebUtils.apiFail(res, 400, "Target channel does not exist on Twitch");
			}
		}

		const userData = await User.getByID(userID);
		if (platformData.Name === "Twitch" && userData.Name !== targetChannel) {
			const escapedChannel = targetChannel.replace(/\W/g, "").toLowerCase();
			const { mods } = await sb.Got("Global", {
				url: `https://api.ivr.fi/v2/twitch/modvip/${escapedChannel}`
			}).json();

			const isModerator = mods.find(i => i.login === userData.Name);
			if (!isModerator) {
				return WebUtils.apiFail(res, 403, "You are not a moderator in the target channel");
			}
		}

		const requestPending = await Suggestion.existsCustom(q => q
			.where("Category = %s", "Bot addition")
			.where("Status IS NULL OR Status = %s", "Approved")
			.where("Text %*like*", `Channel: ${targetChannel}`)
			.where("Text %*like*", `Platform: ${platformData.Name}`)
		);

		if (requestPending) {
			return WebUtils.apiFail(res, 400, "Bot request for this channel is already pending");
		}

		let extraNotes = "";
		if (platformData.Name === "Twitch") {
			let followsPromise = {};
			const requiredConfigs = ["TWITCH_OAUTH", "TWITCH_CLIENT_ID"];
			if (requiredConfigs.every(config => sb.Config.has(config, true))) {
				followsPromise = sb.Got("Helix", {
					url: "users/follows",
					searchParams: {
						to_id: twitchChannelID
					}
				});
			}

			const [follows, bttv, ffz, sevenTv, recent, stream] = await Promise.all([
				followsPromise,
				sb.Got("Global", {
					url: `https://api.betterttv.net/3/cached/users/twitch/${twitchChannelID}`,
				}),
				sb.Got("Global", {
					url: `https://api.frankerfacez.com/v1/room/${targetChannel}`,
				}),
				sb.Got("Global", {
					url: `https://7tv.io/v3/users/twitch/${twitchChannelID}`
				}),
				sb.Got("Global", {
					url: `https://recent-messages.robotty.de/api/v2/recent-messages/${targetChannel}`,
					searchParams: {
						hide_moderation_messages: "true",
						limit: "1"
					}
				}),
				sb.Got("Global", {
					url: `https://api.ivr.fi/v2/twitch/user`,
					searchParams: {
						id: twitchChannelID
					}
				})
			]);

			const stats = [];
			if (bttv.statusCode === 200) {
				const { channelEmotes, sharedEmotes } = bttv.body;
				stats.push(`${channelEmotes.length + sharedEmotes.length}x BTTV emotes`);
			}
			if (ffz.statusCode === 200) {
				const emotes = ffz.body.sets[ffz.body.room.set].emoticons;
				stats.push(`${emotes.length}x FFZ emotes`);
			}
			if (sevenTv.statusCode === 200) {
				const emotes = sevenTv.body?.emote_set?.emotes ?? [];
				stats.push(`${emotes.length}x 7TV emotes`);
			}
			if (follows.statusCode === 200) {
				stats.push(`${follows.body.total} followers`);
			}
			if (recent.statusCode === 200 && recent.body.messages.length !== 0) {
				const lastMessage = recent.body.messages.pop();
				const messageTimestamp = Number(lastMessage.match(/rm-received-ts=(\d+)/)?.[1]);

				if (!sb.Utils.isValidInteger(messageTimestamp)) {
					stats.push(`last recent-message sent: (unknown). dump: ${lastMessage}`);
				}
				else {
					const delta = sb.Utils.timeDelta(new sb.Date(messageTimestamp));
					stats.push(`last recent-message sent: ${delta}.`);
				}
			}
			if (stream.statusCode === 200 && stream.body[0]?.lastBroadcast.startedAt) {
				const delta = sb.Utils.timeDelta(new sb.Date(stream.body[0].lastBroadcast.startedAt));
				stats.push(`last stream started ${delta}`);
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

		return WebUtils.apiSuccess(res, {
			success: true,
			suggestionID: insertId
		});
	});

	return Router;
})();
