module.exports = (function () {
	const TemplateModule = require("../template.js");

	class UserAlias extends TemplateModule {
		static get name () { return "user-alias"; }
		static get database () { return "chat_data"; }
		static get table () { return "User_Alias"; }
	}

	return UserAlias;
})();
