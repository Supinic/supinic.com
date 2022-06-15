module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class DallE extends TemplateModule {
		static async getImages (id) {
			return await this.selectCustom(q => q
				.select("Data", "Created", "Creation_Time")
				.where("ID = %s", id)
			);
		}

		static get name () { return "dalle"; }
		static get database () { return "data"; }
		static get table () { return "DALL-E"; }
	}

	return DallE;
})();
