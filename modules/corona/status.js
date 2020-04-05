module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Status extends TemplateModule {
		static async latest () {
			return this.selectMultipleCustom(q => q
				.select("Place.Name AS Place_Name")
				.join({
					toTable: "Place",
					on: "Place.ID = Status.Place"
				})
				.where("Latest = %b", true)
			);
		}

		static get name () { return "status"; }
		static get database () { return "corona"; }
		static get table () { return "Status"; }
	}

	return Status;
})();