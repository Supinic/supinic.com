module.exports = (function () {
	const TemplateModule = require("../template.js");

	class MessageMetaUserAlias extends TemplateModule {
		static get name () { return "message-meta-user-alias"; }
		static get database () { return "chat_data"; }
		static get table () { return "Message_Meta_User_Alias"; }
	}

	return MessageMetaUserAlias;
})();
