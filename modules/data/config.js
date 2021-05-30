module.exports = (function () {
	"use strict";

	// const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	class Config extends TemplateModule {
		static get name () { return "config"; }
		static get database () { return "data"; }
		static get table () { return "Config"; }
	}

	return Config;
})();
