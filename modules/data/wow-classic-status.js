module.exports = (function () {
	"use strict";

	// const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	class WoWStatus extends TemplateModule {
		static async list () {
			return (await super.selectMultipleCustom(q => q
				.select("User_Alias.Name AS User_Name")
				.join("chat_data", "User_Alias")
			)).map(i => ({
				Name: i.User_Name,
				Status: i.Status,
				Play: i.Normalized_Status,
				Faction: i.Faction,
				Cority: i.Core
			}));
		}

		static get name () { return "wow-classic-status"; }
		static get database () { return "data"; }
		static get table () { return "WoW_Classic"; }
	}

	return WoWStatus;
})();
