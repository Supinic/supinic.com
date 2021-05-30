module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Place extends TemplateModule {
		static getCountries () {
			return this.selectMultipleCustom(q => q
				.where("Parent IS NULL")
				.where("Region IS NOT NULL")
			);
		}

		static getRegions (parent) {
			return this.selectMultipleCustom(q => q
				.where({ condition: parent }, "Parent = %s", parent)
				.where({ condition: !parent }, "Parent IS NULL")
				.where("Region IS NOT NULL")
			);
		}

		static get name () { return "status"; }
		static get database () { return "corona"; }
		static get table () { return "Place"; }
	}

	return Place;
})();
