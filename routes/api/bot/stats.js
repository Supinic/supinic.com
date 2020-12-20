module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const cacheKey = "website-bot-stats";

	Router.get("/", async (req, res) => {
		const cacheData = await sb.Cache.getByPrefix(cacheKey);
		if (cacheData) {
			return sb.WebUtils.apiSuccess(res, cacheData);
		}

		const [
			activeChannels,
			totalUsers,
			activeUsers,
			{ Bytes: chatLineSize, Line_Count: chatLines },
			commands,
			totalAFKs,
			activeAFKs,
			totalReminders,
			activeReminders,
			activeFilters
		] = await Promise.all([
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
				active: activeChannels
			},
			users: {
				active: activeUsers.length,
				total: totalUsers
			},
			chatLines: {
				size: chatLineSize,
				total: chatLines
			},
			commands: {
				active: commands
			},
			afk: {
				active: activeAFKs,
				total: totalAFKs
			},
			reminders: {
				active: activeReminders,
				total: totalReminders,
			},
			filters: {
				active: activeFilters
			}
		};
		await sb.Cache.setByPrefix(cacheKey, data, {
			expiry: 86e5
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();