module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class BadApple extends TemplateModule {
		static get name () { return "bad-apple"; }
		static get database () { return "data"; }
		static get table () { return "Bad_Apple"; }
	}

	return BadApple;
})();