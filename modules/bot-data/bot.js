module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class ChannelBot extends TemplateModule {
		static get name () { return "bot"; }
		static get database () { return "bot_data"; }
		static get table () { return "Bot"; }
	}

	return ChannelBot;
})();
