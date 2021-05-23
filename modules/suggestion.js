module.exports = (function () {
	"use strict";

	return class Suggestion {
		static async init () {
			await sb.Query.raw("SET NAMES 'utf8mb4'");
			return true;
		}

		static async get (ID, ...fields) {
			const obj = await sb.Query.getRow("data", "Suggestion");
			await obj.load(ID);

			const ret = {};
			for (const field of fields) {
				ret[field] = obj.values[field];
			}

			return ret;
		}
		
		static async getAll () {
			const data = await sb.Query.getRecordset(rs => rs
				.select("Suggestion.*")
				.select("User_Alias.Name")
				.from("data", "Suggestion")
				.join("chat_data", "User_Alias")
				.orderBy("Suggestion.ID")
			);

			const ret = [];
			for (const row of data) {
				ret.push({
					ID: row.ID,
					Name: row.Name,
					Text: row.Text,
					Category: row.Category,
					Status: row.Status,
					Notes: row.Notes
				});
			}

			return ret;
		}
		
		static async insert (data) {
			const obj = await sb.Query.getRow("data", "Suggestion");
			for (const key of Object.keys(data)) {
				obj.values[key] = data[key];
			}

			await obj.save();
			return true;
		}
	};
})();
