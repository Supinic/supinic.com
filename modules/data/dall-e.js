module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class DallE extends TemplateModule {
		static async getImages (id) {
			const row = await sb.Query.getRow("data", "DALL-E");
			await row.load(id, true);

			if (!row.loaded) {
				return null;
			}

			return {
				Prompt: row.values.Prompt,
				Created: row.values.Created,
				Creation_Time: row.values.Creation_Time,
				Images: JSON.parse(row.values.Data.replace(/\\n/g, ""))
			};
		}

		static async getAll () {
			return await sb.Query.getRecordset(rs => rs
				.select("ID", "Prompt", "Created")
				.from("data", "DALL-E")
			);
		}

		static get name () { return "dalle"; }
		static get database () { return "data"; }
		static get table () { return "DALL-E"; }
	}

	return DallE;
})();
