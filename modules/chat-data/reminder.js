module.exports = (function () {
	const TemplateModule = require("../template.js");
	const Result = require("../result.js");

	class Reminder extends TemplateModule {
		static async listByUser (userIdentifier, type = "all", specific = []) {
			if (typeof userIdentifier !== "string" && typeof userIdentifier !== "number") {
				return new Result(false, "Reminder listByUser: invalid identifier type");
			}

			let userID = userIdentifier;
			if (typeof userIdentifier === "string") {
				const userData = await sb.User.get(userIdentifier);
				if (!userData) {
					return [];
				}
				else {
					userID = userData.ID;
				}
			}

			return await super.selectMultipleCustom(rs => {
				rs.select("Channel.Name AS Channel_Name")
					.select("RAuthor.Name AS Author")
					.select("RTarget.Name AS Target")
					.leftJoin("chat_data", "Channel")
					.join({
						alias: "RAuthor",
						toDatabase: "chat_data",
						toTable: "User_Alias",
						on: "Reminder.User_From = RAuthor.ID"
					})
					.join({
						alias: "RTarget",
						toDatabase: "chat_data",
						toTable: "User_Alias",
						on: "Reminder.User_To = RTarget.ID"
					})
					.where("Type = %s OR Type = %s", "Reminder", "Deferred")
					.where("RAuthor.ID = %n OR RTarget.ID = %n", userID, userID);

				if (type === "active") {
					rs.where("Active = %b", true);
				}
				else if (type === "inactive") {
					rs.where("Active = %b", false);
				}
				else if (type === "specific") {
					rs.where("Reminder.ID IN %n+", specific);
				}

				return rs;
			});
		}

		static get name () { return "reminder"; }
		static get database () { return "chat_data"; }
		static get table () { return "Reminder"; }
	}

	return Reminder;
})();
