module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class DallE extends TemplateModule {
		static async getImages (id) {
			const data = await this.selectCustom(q => q
				.select("Data AS Images", "Created", "Creation_Time")
				.where("ID = %s", id)
			);

			for (const row of data) {
				row.Images = row.Images.replace(/\\n/g, "");
			}

			return data;
		}

		static get name () { return "dalle"; }
		static get database () { return "data"; }
		static get table () { return "DALL-E"; }
	}

	return DallE;
})();
