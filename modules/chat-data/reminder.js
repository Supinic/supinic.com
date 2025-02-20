const WebUtils = require("../../utils/webutils");
module.exports = (function () {
	const TemplateModule = require("../template.js");

	const User = require("../chat-data/user-alias.js");

	const parseUserIdentifier = async (identifier) => {
		if (typeof identifier !== "string") {
			return identifier;
		}

		const userData = await User.getByName(identifier);
		if (!userData) {
			return null;
		}
		else {
			return userData.ID;
		}
	};

	const standardRecordsetCallback = (rs, table, userID) => rs
		.select(`${table}.*`)
		.select("Channel.Name AS Channel_Name")
		.select("Reminder_Author.Name AS Author")
		.select("Reminder_Target.Name AS Target")
		.from("chat_data", table)
		.leftJoin("chat_data", "Channel")
		.join({
			alias: "Reminder_Author",
			toDatabase: "chat_data",
			toTable: "User_Alias",
			on: `${table}.User_From = Reminder_Author.ID OR ${table}.User_From IS NULL`
		})
		.join({
			alias: "Reminder_Target",
			toDatabase: "chat_data",
			toTable: "User_Alias",
			on: `${table}.User_To = Reminder_Target.ID`
		})
		.where("Type = %s OR Type = %s", "Reminder", "Deferred")
		.where("Reminder_Author.ID = %n OR Reminder_Target.ID = %n", userID, userID);

	class Reminder extends TemplateModule {
		static async listByUser (userIdentifier, type) {
			const userID = await parseUserIdentifier(userIdentifier);
			if (!userID) {
				return [];
			}

			const table = (type === "active") ? "Reminder" : "Reminder_History";
			const data = await sb.Query.getRecordset(rs => {
				standardRecordsetCallback(rs, table, userID);
				return rs;
			});

			for (const row of data) {
				row.Active = (type === "active");

				if (typeof row.Text === "string") {
					row.Text = sb.Utils.escapeHTML(row.Text);
				}
			}

			return data;
		}

		static async getSpecificForUser (userIdentifier, specificIds) {
			const userID = await parseUserIdentifier(userIdentifier);
			if (!userID) {
				return [];
			}

			const [liveData, historyData] = await Promise.all([
				sb.Query.getRecordset(rs => {
					standardRecordsetCallback(rs, "Reminder", userID);
					rs.select("1 AS Active");
					rs.where("Reminder.ID IN %n+", specificIds);

					return rs;
				}),
				sb.Query.getRecordset(rs => {
					standardRecordsetCallback(rs, "Reminder_History", userID);
					rs.select("0 AS Active");
					rs.where("Reminder_History.ID IN %n+", specificIds);

					return rs;
				})
			]);

			const data = [...liveData, ...historyData];
			for (const row of data) {
				row.Active = (row.Active === 1);

				if (typeof row.Text === "string") {
					row.Text = sb.Utils.escapeHTML(row.Text);
				}
			}

			return data;
		}

		static async getDetail (ID) {
			let table = "Reminder";
			let row = await sb.Query.getRow("chat_data", table);
			await row.load(ID, true);

			if (!row.loaded) {
				table = "Reminder_History";
				row = await sb.Query.getRow("chat_data", table);
				await row.load(ID, true);
			}

			if (!row.loaded) {
				return null;
			}

			const platformsData = await WebUtils.getSupibotPlatformData();
			if (!platformsData) {
				throw new sb.Error({
					message: "Could not fetch Supibot platform data"
				});
			}

			const data = await sb.Query.getRecordset(rs => rs
				.select(`${table}.*`)
				.select("Channel.Name AS Channel_Name", "Channel.Platform AS PlatformID")
				.select("Sender.ID AS Sender_ID", "Sender.Name AS Sender_Name")
				.select("Recipient.ID AS Recipient_ID", "Recipient.Name AS Recipient_Name")
				.from("chat_data", table)
				.where(`${table}.ID = %n`, ID)
				.leftJoin("chat_data", "Channel")
				.join({
					alias: "Sender",
					fromField: "User_From",
					toDatabase: "chat_data",
					toTable: "User_Alias",
					toField: "ID"
				})
				.join({
					alias: "Recipient",
					fromField: "User_To",
					toDatabase: "chat_data",
					toTable: "User_Alias",
					toField: "ID"
				})
				.single()
			);

			if (data.PlatformID) {
				const platformData = platformsData[data.PlatformID];
				data.Platform_Name = platformData?.name ?? null;
			}
			else {
				data.Platform_Name = null;
			}

			return {
				table,
				data,
				row
			};
		}

		static get name () { return "reminder"; }
		static get database () { return "chat_data"; }
		static get table () { return "Reminder"; }
	}

	return Reminder;
})();
