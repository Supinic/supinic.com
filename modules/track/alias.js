module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Alias extends TemplateModule {
		static get name () { return "alias"; }
		static get database () { return "music"; }
		static get table () { return "Alias"; }
	}

	return Alias;
})();
