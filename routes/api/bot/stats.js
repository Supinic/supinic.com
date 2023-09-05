const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const firstCommandExecution = new sb.Date("2019-02-28 23:26:36");
	// const oldCommandExecutions = 938178;

	const fetchSizeTables = [
		"AFK",
		"Channel_Data",
		"Message_Meta_Channel",
		"Message_Meta_User_Alias",
		"Reminder",
		"User_Alias",
		"User_Alias_Data"
	];
	const cacheKey = "website-bot-stats";

	const getSize = (data, tableName) => data.find(i => i.Name === tableName).Total;

	Router.get("/", async (req, res) => {
		const cacheData = await sb.Cache.getByPrefix(cacheKey);
		if (cacheData) {
			return WebUtils.apiSuccess(res, cacheData, {
				skipCaseConversion: true
			});
		}

		const [
			tableSizes,
			channelDataResponse,
			discordDataResponse,
			totalUsers,
			activeUsers,
			logsSizeResponse,
			commandListResponse,
			totalAFKs,
			totalReminders
		] = await Promise.all([
			sb.Query.getRecordset(rs => rs
				.select("TABLE_NAME AS Name", "(DATA_LENGTH + INDEX_LENGTH) AS Total")
				.from("INFORMATION_SCHEMA", "TABLES")
				.where("TABLE_SCHEMA = %s", "chat_data")
				.where("TABLE_NAME IN %s+", fetchSizeTables)
			),
			sb.Got("Supibot", "channel/stats"),
			sb.Got("Supibot","platform/discordGuildCount"),
			sb.Query.getRecordset(rs => rs
				.select("MAX(ID) AS Total")
				.from("chat_data", "User_Alias")
				.single()
				.flat("Total")
			),
			sb.Cache.getKeysByPrefix("sb-user-*", {}),
			sb.Got("RPi4", "ssd/size"),
			sb.Got("Supibot", "command/list"),
			sb.Query.getRecordset(rs => rs
				.select("MAX(ID) AS Total")
				.from("chat_data", "AFK")
				.single()
				.flat("Total")
			),
			sb.Query.getRecordset(rs => rs
				.select("MAX(ID) AS Total")
				.from("chat_data", "Reminder")
				.single()
				.flat("Total")
			)
		]);

		const channelCount = channelDataResponse?.body?.data ?? {};
		const discordGuildData = discordDataResponse?.body?.data ?? {};
		const data = {
			channels: {
				total: channelCount.total ?? 0,
				twitch: channelCount.platforms?.twitch ?? 0,
				discord: channelCount.platforms?.discord ?? 0,
				"discord-guilds": discordGuildData.count ?? 0,
				cytube: channelCount.platforms?.cytube ?? 0,
				irc: channelCount.platforms?.irc ?? 0,
				metaSize: getSize(tableSizes, "Channel_Data")
			},
			users: {
				active: activeUsers.length,
				total: Number(totalUsers),
				size: getSize(tableSizes, "User_Alias_Data"),
				metaSize: getSize(tableSizes, "Message_Meta_User_Alias")
			},
			chatLines: {
				size: logsSizeResponse.body?.data?.size ?? null
			},
			commands: {
				active: commandListResponse.body?.data?.length ?? null,
				// countTotal: oldCommandExecutions + newCommandExecutions,
				firstExecution: firstCommandExecution
			},
			afk: {
				total: Number(totalAFKs),
				size: getSize(tableSizes, "AFK")
			},
			reminders: {
				total: Number(totalReminders),
				size: getSize(tableSizes, "Reminder")
			}
		};

		await sb.Cache.setByPrefix(cacheKey, data, {
			expiry: 3_600_000
		});

		return WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	return Router;
})();
