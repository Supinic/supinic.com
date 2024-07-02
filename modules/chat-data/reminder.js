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

	const standardRecordsetCallback = (rs, userID) => rs
		.select("Channel.Name AS Channel_Name")
		.select("Reminder_Author.Name AS Author")
		.select("Reminder_Target.Name AS Target")
		.leftJoin("chat_data", "Channel")
		.join({
			alias: "Reminder_Author",
			toDatabase: "chat_data",
			toTable: "User_Alias",
			on: "User_From = Reminder_Author.ID"
		})
		.join({
			alias: "Reminder_Target",
			toDatabase: "chat_data",
			toTable: "User_Alias",
			on: "User_To = Reminder_Target.ID"
		})
		.where("Type = %s OR Type = %s", "Reminder", "Deferred")
		.where("Reminder_Author.ID = %n OR Reminder_Target.ID = %n", userID, userID);

	class Reminder extends TemplateModule {
		static async listByUser (userIdentifier, type) {
			const userID = await parseUserIdentifier(userIdentifier);
			if (!userID) {
				return [];
			}

			const data = await sb.Query.getRecordset(rs => {
				standardRecordsetCallback(rs, userID);

				if (type === "active") {
					rs.from("chat_data", "Reminder");
				}
				else if (type === "inactive") {
					rs.from("chat_data", "Reminder_History");
				}

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
					standardRecordsetCallback(rs, userID);
					rs.select("1 AS Active");
					rs.from("chat_data", "Reminder");
					rs.where("ID IN %n+", specificIds);

					return rs;
				}),
				sb.Query.getRecordset(rs => {
					standardRecordsetCallback(rs, userID);
					rs.select("0 AS Active");
					rs.from("chat_data", "Reminder_History");
					rs.where("ID IN %n+", specificIds);

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

		static get name () { return "reminder"; }
		static get database () { return "chat_data"; }
		static get table () { return "Reminder"; }
	}

	return Reminder;
})();
