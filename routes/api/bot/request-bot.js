const Express = require("express");
const Router = Express.Router();

const Channel = require("../../../modules/chat-data/channel.js");
const Suggestion = require("../../../modules/data/suggestion.js");
const User = require("../../../modules/chat-data/user-alias.js");
const WebUtils = require("../../../utils/webutils.js");

const BASE_CACHE_KEY = "website-twitch-auth-bot";

const PLATFORM_TWITCH = "twitch";
const PLATFORM_CYTUBE = "cytube";
const SUPPORTED_PLATFORMS = [PLATFORM_TWITCH, PLATFORM_CYTUBE];
const PLATFORM_ID = {
	twitch: 1,
	cytube: 3
};

const isModerator = async (userName, channelID) => {
	const response = await sb.Got.gql({
		url: "https://gql.twitch.tv/gql",
		responseType: "json",
		headers: {
			Accept: "*/*",
			"Accept-Language": "en-US",
			Authorization: `OAuth ${process.env.TWITCH_GQL_OAUTH}`,
			"Client-ID": process.env.TWITCH_GQL_CLIENT_ID,
			"Client-Version": process.env.TWITCH_GQL_CLIENT_VERSION,
			"Content-Type": "text/plain;charset=UTF-8",
			Referer: `https://dashboard.twitch.tv/`,
			"X-Device-ID": process.env.TWITCH_GQL_DEVICE_ID
		},
		query: ` 
			query {
				user(login:"${userName}", lookupType:ALL) {
					isModerator(channelID:"${channelID}")
				}
			}
		`
	});

	if (!response.ok || typeof response.body.data?.user?.isModerator !== "boolean") {
		return {
			success: false,
			statusCode: response.statusCode
		};
	}
	else {
		return {
			success: true,
			isModerator: Boolean(response.body.data.user.isModerator)
		};
	}
};

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

		if (!SUPPORTED_PLATFORMS.includes(platform)) {
			return WebUtils.apiFail(res, 400, "Invalid platform provided");
		}

		if (platform === PLATFORM_TWITCH) {
			const helixChannelResponse = await sb.Got.get("Helix")({
				url: "users",
				searchParams: {
					login: targetChannel
				}
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
					const response = await sb.Got.get("Supibot")({
						url: "command/execute",
						searchParams: {
							invocation: "bot",
							platform: PLATFORM_TWITCH,
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
			.where("Platform = %n", PLATFORM_ID[platform])
		);

		if (exists) {
			if (exists.Mode === "Inactive") {
				const inactiveReason = await sb.Query.getRecordset(rs => rs
					.select("Value")
					.from("chat_data", "Channel_Data")
					.where("Channel = %n", exists.ID)
					.where("Property = %s", "inactive-reason")
					.limit(1)
					.single()
					.flat("Value")
				);

				if (inactiveReason === "channel-inactive") {
					return WebUtils.apiFail(res, 409, sb.Utils.tag.trim `
						The bot has been removed from target channel because of prolonged inactivity.
						You can immediately receive the bot back by using this command →
						$bot rejoin channel:"${targetChannel}"
					`);
				}
				else if (inactiveReason === "suspended") {
					return WebUtils.apiFail(res, 409, sb.Utils.tag.trim `
						The bot has been forced to leave the target channel because the channel has been suspended.
						You can immediately receive the bot back by using this command →
						$bot rejoin channel:"${targetChannel}"
					`);
				}
				else if (inactiveReason === "bot-banned") {
					return WebUtils.apiFail(res, 409, sb.Utils.tag.trim `
						The bot has been forced to leave the target channel because the bot has been permanently banned.
						You can immediately receive the bot back by unbanning the bot and using this command →
						$bot i-will-not-ban-supibot-again channel:"${targetChannel}"
					`);
				}

				const scopeDisabled = await sb.Query.getRecordset(rs => rs
					.select("Value")
					.from("chat_data", "Channel_Data")
					.where("Channel = %n", exists.ID)
					.where("Property = %s", "twitchNoScopeDisabled")
					.limit(1)
					.single()
					.flat("Value")
				);
				if (scopeDisabled) {
					return WebUtils.apiFail(res, 409, sb.Utils.tag.trim `
						The bot has been removed from target channel because of inactivity during the Twitch permission change.
						You can immediately receive the bot back by either modding it or giving it permission to chat (on this site: Supibot > Allow Supibot...)
						and then running this command: $bot rejoin channel:"${targetChannel}"
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
		if (platform === PLATFORM_TWITCH) {
			const helixUserResponse = await sb.Got.get("Helix")({
				url: "users",
				searchParams: {
					login: targetChannel
				}
			});

			twitchChannelID = helixUserResponse.body.data?.[0].id;

			if (!twitchChannelID) {
				return WebUtils.apiFail(res, 400, "Target channel does not exist on Twitch");
			}
		}

		const userData = await User.getByID(userID);
		if (platform === PLATFORM_TWITCH && userData.Name.toLowerCase() !== targetChannel.toLowerCase()) {
			const modCheck = await isModerator(userData.Name, twitchChannelID);
			if (!modCheck.success) {
				return WebUtils.apiFail(res, 503, "Could not check for moderator status, try again later");
			}

			if (!modCheck.isModerator) {
				return WebUtils.apiFail(res, 403, "You are not a moderator in the target channel");
			}
		}

		const requestPending = await Suggestion.existsCustom(q => q
			.where("Category = %s", "Bot addition")
			.where("Status IS NULL OR Status = %s", "Approved")
			.where("Text %*like*", `Channel: ${targetChannel}`)
			.where("Text %*like*", `Platform: ${platform}`)
		);

		if (requestPending) {
			return WebUtils.apiFail(res, 400, "Bot request for this channel is already pending");
		}

		const modCheck = await isModerator("Supibot", twitchChannelID);
		if (!modCheck.success) {
			return WebUtils.apiFail(res, 503, "Could not check for moderator status, try again later");
		}

		const cacheKey = `${BASE_CACHE_KEY}-${twitchChannelID}`;
		const hasAuthorization = Boolean(await sb.Cache.getByPrefix(cacheKey));
		if (!hasAuthorization && !modCheck.isModerator) {
			return WebUtils.apiFail(res, 400, "Bot is neither permitted to chat nor a moderator, refer to \"Breaking news\"");
		}

		let extraNotes = "";
		if (platform === PLATFORM_TWITCH) {
			const [bttv, ffz, sevenTv, recent, user, suggests] = await Promise.all([
				sb.Got.get("Global")({
					url: `https://api.betterttv.net/3/cached/users/twitch/${twitchChannelID}`
				}),
				sb.Got.get("Global")({
					url: `https://api.frankerfacez.com/v1/room/${targetChannel}`
				}),
				sb.Got.get("Global")({
					url: `https://7tv.io/v3/users/twitch/${twitchChannelID}`
				}),
				sb.Got.get("Global")({
					url: `https://recent-messages.robotty.de/api/v2/recent-messages/${targetChannel}`,
					searchParams: {
						hide_moderation_messages: "true",
						limit: "1"
					}
				}),
				sb.Got.get("Global")({
					url: `https://api.ivr.fi/v2/twitch/user`,
					searchParams: {
						id: twitchChannelID
					}
				}),
				sb.Query.getRecordset(rs => rs
					.select("Status")
					.from("data", "Suggestion")
					.where("Status IS NOT NULL")
					.where("Category = %s", "Bot addition")
					.where("Text %like*", `Channel: ${targetChannel}`)
					.flat("Status")
				)
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
			if (user.statusCode === 200 && user.body[0]) {
				const data = user.body[0];
				if (data.lastBroadcast.startedAt) {
					const delta = sb.Utils.timeDelta(new sb.Date(data.lastBroadcast.startedAt));
					stats.push(`last stream started ${delta}`);
				}

				const followersString = (data.followers)
					? `${data.followers} followers`
					: `no followers`;
				stats.push(followersString);

				const chattersString = (data.chatterCount)
					? `${data.chatterCount} chatters`
					: `no chatters`;
				stats.push(chattersString);
			}
			if (suggests.length > 0) {
				stats.push(`${suggests.length} previous requests, statuses: ${suggests.join(", ")}`);
			}

			const list = stats.map(i => `\t${i}`).join("\n");
			extraNotes = `\nStatistics:\n${list}`;
		}

		const { insertId } = await Suggestion.insert({
			User_Alias: userData.ID,
			Text: `Channel: ${targetChannel} \nRequested by: ${userData.Name} \nPlatform: ${platform} \nDescription: ${description ?? "N/A"}${extraNotes}`,
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
