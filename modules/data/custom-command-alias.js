module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class CustomCommandAlias extends TemplateModule {
		static get name () { return "custom-command-alias"; }
		static get database () { return "data"; }
		static get table () { return "Custom_Command_Alias"; }
	}

	return CustomCommandAlias;
})();
