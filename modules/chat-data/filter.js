module.exports = (function () {
	const TemplateModule = require("../template.js");
	// const Result = require("../result.js");

	class Filter extends TemplateModule {
		static get name () { return "filter"; }
		static get database () { return "chat_data"; }
		static get table () { return "Filter"; }
	}

	return Filter;
})();