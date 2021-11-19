module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Playsound extends TemplateModule {
		static get name () { return "playsounds"; }
		static get database () { return "data"; }
		static get table () { return "Playsound"; }
	}

	return Playsound;
})();
