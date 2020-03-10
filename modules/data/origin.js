module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Origin extends TemplateModule {
		static get name () { return "origin"; }
		static get database () { return "data"; }
		static get table () { return "Origin"; }
	}

	return Origin;
})();