module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class FAQ extends TemplateModule {
		static get name () { return "faq"; }
		static get database () { return "data"; }
		static get table () { return "FAQ"; }
	}

	return FAQ;
})();