module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const firstCommandExecution = new sb.Date("2019-02-28 23:26:36");
	const oldCommandExecutions = 938178;

	const fetchSizeTables = ["AFK", "Message_Meta_Channel", "Message_Meta_User_Alias", "Reminder", "User_Alias"];
	const cacheKey = "website-bot-stats";

	const getSize = (data, tableName) => data.find(i => i.Name === tableName).Total;

	Router.get("/", async (req, res) => {
		const cacheData = await sb.Cache.getByPrefix(cacheKey);
		if (cacheData) {
			return sb.WebUtils.apiSuccess(res, cacheData);
		}

		const [
			tableSizes,
			activeChannels,
			totalUsers,
			activeUsers,
			{ Bytes: chatLineSize, Line_Count: chatLines },
			commands,
			commandsSinceRestart,
			newCommandExecutions,
			totalAFKs,
			activeAFKs,
			totalReminders,
			activeReminders,
			activeFilters
		] = await Promise.all([
			sb.Query.getRecordset(rs => rs
				.select("TABLE_NAME AS Name", "(DATA_LENGTH + INDEX_LENGTH) AS Total")
				.from("INFORMATION_SCHEMA", "TABLES")
				.where("TABLE_SCHEMA = %s", "chat_data")
				.where("TABLE_NAME IN %s+", fetchSizeTables)
			),
			sb.Query.getRecordset(rs => rs
			    .select("COUNT(*) AS Total")
			    .from("chat_data", "Channel")
				.where("Mode <> %s", "Inactive")
				.single()
				.flat("Total")
			),
			sb.Query.getRecordset(rs => rs
				.select("MAX(ID) AS Total")
				.from("chat_data", "User_Alias")
				.single()
				.flat("Total")
			),
			sb.Cache.getKeysByPrefix("sb-user-*", {}),
			sb.Query.getRecordset(rs => rs
				.select("(SUM(DATA_LENGTH) + SUM(INDEX_LENGTH)) AS Bytes")
				.select("SUM(AUTO_INCREMENT) AS Line_Count")
				.from("INFORMATION_SCHEMA", "TABLES")
				.where("TABLE_SCHEMA = %s", "chat_line")
				.single()
			),
			sb.Query.getRecordset(rs => rs
				.select("COUNT(*) AS Total")
				.from("chat_data", "Command")
				.where("Flags NOT %*like*", "archived")
				.single()
				.flat("Total")
			),
			sb.Runtime.commands,
			sb.Query.getRecordset(rs => rs
				.select("COUNT(*) AS Total")
				.from("chat_data", "Command_Execution")
				.single()
				.flat("Total")
			),
			sb.Query.getRecordset(rs => rs
				.select("MAX(ID) AS Total")
				.from("chat_data", "AFK")
				.single()
				.flat("Total")
			),
			sb.Query.getRecordset(rs => rs
				.select("COUNT(*) AS Total")
				.from("chat_data", "AFK")
				.where("Active = %b", true)
				.single()
				.flat("Total")
			),
			sb.Query.getRecordset(rs => rs
				.select("MAX(ID) AS Total")
				.from("chat_data", "Reminder")
				.single()
				.flat("Total")
			),
			sb.Query.getRecordset(rs => rs
				.select("COUNT(*) AS Total")
				.from("chat_data", "Reminder")
				.where("Active = %b", true)
				.single()
				.flat("Total")
			),
			sb.Query.getRecordset(rs => rs
				.select("COUNT(*) AS Total")
				.from("chat_data", "Filter")
				.where("Active = %b", true)
				.single()
				.flat("Total")
			)
		]);

		const data = {
			channels: {
				active: activeChannels,
				meta: {
					size: getSize(tableSizes, "Message_Meta_Channel")
				}
			},
			users: {
				active: activeUsers.length,
				total: totalUsers,
				size: getSize(tableSizes, "User_Alias"),
				meta: {
					size: getSize(tableSizes, "Message_Meta_User_Alias")
				}
			},
			chatLines: {
				size: chatLineSize,
				total: chatLines
			},
			commands: {
				active: commands,
				executions: {
					first: firstCommandExecution,
					total: oldCommandExecutions + newCommandExecutions,
					sinceRestart: commandsSinceRestart
				}
			},
			afk: {
				active: activeAFKs,
				total: totalAFKs,
				size: getSize(tableSizes, "AFK")
			},
			reminders: {
				active: activeReminders,
				total: totalReminders,
				size: getSize(tableSizes, "Reminder")
			},
			filters: {
				active: activeFilters
			}
		};

		await sb.Cache.setByPrefix(cacheKey, data, {
			expiry: 3_600_000
		});

		return sb.WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	return Router;
})();