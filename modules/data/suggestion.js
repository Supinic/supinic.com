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
					.orderBy("Suggestion.ID");

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

		static get name () { return "track"; }
		static get database () { return "data"; }
		static get table () { return "Suggestion"; }
	}

	return Suggestion;
})();