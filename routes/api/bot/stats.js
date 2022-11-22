const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const firstCommandExecution = new sb.Date("2019-02-28 23:26:36");
	const oldCommandExecutions = 938178;

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
			channelsData,
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
			sb.Query.getRecordset(rs => rs
				.select("LOWER(Platform.Name) AS Name")
				.from("chat_data", "Channel")
				.join("chat_data", "Platform")
				.where("Mode <> %s", "Inactive")
				.flat("Name")
			),
			sb.Query.getRecordset(rs => rs
				.select("MAX(ID) AS Total")
				.from("chat_data", "User_Alias")
				.single()
				.flat("Total")
			),
			sb.Cache.getKeysByPrefix("sb-user-*", {}),
			sb.Got("RaspberryPi4", { url: "ssd/size" }),
			sb.Got("Supibot", { url: "command/list" }),
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

		const platformChannels = { total: 0 };
		for (const platformName of channelsData) {
			platformChannels[platformName] ??= 0;
			platformChannels[platformName]++;
			platformChannels.total++;
		}

		const data = {
			channels: {
				...platformChannels,
				metaSize: getSize(tableSizes, "Channel_Data") + getSize(tableSizes, "Message_Meta_Channel")
			},
			users: {
				active: activeUsers.length,
				total: totalUsers,
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
				total: totalAFKs,
				size: getSize(tableSizes, "AFK")
			},
			reminders: {
				total: totalReminders,
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
