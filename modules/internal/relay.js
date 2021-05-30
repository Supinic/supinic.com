module.exports = (function () {
	const TemplateModule = require("../template.js");

	class LinkRelay extends TemplateModule {
		static get name () { return "link-relay"; }
		static get database () { return "supinic.com"; }
		static get table () { return "Link_Relay"; }
	}

	return LinkRelay;
})();
