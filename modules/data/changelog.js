module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Changelog extends TemplateModule {
		static get name () { return "changelog"; }
		static get database () { return "data"; }
		static get table () { return "Changelog"; }
	}

	return Changelog;
})();