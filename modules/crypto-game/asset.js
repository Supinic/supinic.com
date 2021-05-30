module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Asset extends TemplateModule {
		static get name () { return "asset"; }
		static get database () { return "crypto_game"; }
		static get table () { return "Asset"; }
	}

	return Asset;
})();
