module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Platform extends TemplateModule {
		static get name () { return "platform"; }
		static get database () { return "chat_data"; }
		static get table () { return "Platform"; }
	}

	return Platform;
})();