module.exports = (function () {
	"use strict";

	const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	let UserAlias = null;

	class Suggestion extends TemplateModule {
		static async list () {
			return await super.selectMultipleCustom(q => q
				.select("User_Alias.Name AS User_Name")
				.join("chat_data", "User_Alias")
				.where("Status <> %s", "Quarantined")
				.orderBy("Suggestion.ID")
			);
		}

		static async listByUser (userID) {
			userID = Number(userID);

			if (!sb.Utils.isValidInteger(userID)) {
				return new Result(false, "Suggestion: UserAlias ID is not valid");
			}

			UserAlias = UserAlias || require("../chat-data/user-alias.js");
			if (!await UserAlias.exists(userID)) {
				return new Result(false, "Suggestion: UserAlias ID does not exist");
			}

			return (await super.selectMultipleCustom(q => q
				.where("User_Alias = %n", userID)
				.where("Status <> %s", "Quarantined")
				.orderBy("Suggestion.ID")
			)).map(i => ({
				ID: i.ID,
				Date: i.Date.format("Y-m-d H:i"),
				Text: i.Text,
				Category: i.Category,
				Status: i.Status,
				Notes: i.Notes
			}));
		}

		static get name () { return "track"; }
		static get database () { return "data"; }
		static get table () { return "Suggestion"; }
	}

	return Suggestion;
})();