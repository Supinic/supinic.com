module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class ExtraUserData extends TemplateModule {
		static async list () {
			return await super.selectMultipleCustom(q => q
				.select("User_Alias.Name AS Name")
				.join("chat_data", "User_Alias")
			);
		}

		static get name () { return "extra-user-data"; }
		static get database () { return "chat_data"; }
		static get table () { return "Extra_User_Data"; }
	}

	return ExtraUserData;
})();
