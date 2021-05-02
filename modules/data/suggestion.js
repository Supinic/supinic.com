module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Suggestion extends TemplateModule {
		/**
		 * Lists all suggestions, optionally filtered by options.
		 * @param {Object} options = {}
		 * @param {string} [options.category]
		 * @param {string} [options.status]
		 * @param {number} [options.userID]
		 * @returns {Promise<Object[]>}
		 */
		static async list (options = {}) {
			return await super.selectMultipleCustom(q => {
				q.select("User_Alias.Name AS User_Name")
					.join("chat_data", "User_Alias")
					.where("Status <> %s", "Quarantined")
					.orderBy("Suggestion.ID DESC");

				if (options.category) {
					q.where("Category = %s", options.category);
				}
				if (options.status) {
					q.where("Status = %s", options.status);
				}
				if (Number(options.userID)) {
					q.where("User_Alias = %n", Number(options.userID));
				}

				return q;
			});
		}

		static async count () {
			return await super.selectCustom(q => q
				.select("COUNT(*) AS Count")
				.where("Status <> %s", "Quarantined")
				.single()
				.flat("Count")
			);
		}

		static async stats () {
			return await super.selectCustom(rs => rs
			    .select("User_Alias.ID AS User_ID")
			    .select("User_Alias.Name AS User_Name")
				.select("COUNT(*) AS Total")
				.select("(SELECT COUNT(*) FROM data.Suggestion AS X WHERE X.User_Alias = Suggestion.User_Alias AND Status IN (\"Approved\", \"Completed\", \"Moved to Github\")) AS Accepted")
				.select("(SELECT COUNT(*) FROM data.Suggestion AS X WHERE X.User_Alias = Suggestion.User_Alias AND Status IN (\"Dismissed\", \"Denied\")) AS Refused")
			    .from("data", "Suggestion")
				.join("chat_data", "User_Alias")
				.where("Status NOT IN %s+", ["Dismissed by author", "Quarantined"])
				.groupBy("Suggestion.User_Alias")
				.having("COUNT(*) > 1")
				.orderBy("COUNT(*) DESC")
			);
		}

		static async userStats (userID) {
			const data = await Suggestion.selectCustom(rs => rs
				.select("Status", "COUNT(*) AS Global_Amount")
				.select(sb.Utils.tag.trim `
					(
						SELECT COUNT(*) 
						FROM data.Suggestion AS X
						WHERE X.User_Alias = ${userID} AND X.Status = Suggestion.Status
					) AS User_Amount
				`)
				.join("chat_data", "User_Alias")
				.groupBy("Status")
			);

			const userTotal = data.reduce((acc, cur) => acc + cur.User_Amount, 0);
			const globalTotal = data.reduce((acc, cur) => acc + cur.Total_Amount, 0);
			return {
				globalTotal,
				userTotal,
				statuses: data
			};
		}

		static get name () { return "track"; }
		static get database () { return "data"; }
		static get table () { return "Suggestion"; }
	}

	return Suggestion;
})();