module.exports = (function () {
	const TemplateModule = require("../template.js");
	// const Result = require("../result.js");

	class AwayFromKeyboard extends TemplateModule {
		static get statuses () {
			return ["afk", "brb", "food", "gn", "lurk", "poop", "shower", "work"];
		}

		static get name () { return "AFK"; }
		static get database () { return "chat_data"; }
		static get table () { return "AFK"; }
	}

	return AwayFromKeyboard;
})();
