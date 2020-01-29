module.exports = (function () {
	"use strict";

	// const Result = require("../result.js");
	const TemplateModule = require("../template.js");
	const Command = require("../chat-data/command.js");

	class Playsound extends TemplateModule {
		static async getCommand () {
			return await Command.selectSingleCustom(q => q
				.where("Name = %s", "playsound")
			);
		}

		static get name () { return "playsounds"; }
		static get database () { return "data"; }
		static get table () { return "Playsound"; }
	}

	return Playsound;
})();