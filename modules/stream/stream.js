module.exports = (function () {
	const TemplateModule = require("../template.js");

	const aliases = [
		"Stream.Video_ID as ID",
		"Stream.Date as date",
		"Stream.Start as start",
		"Stream.End as end"
	];

	class Stream extends TemplateModule {
		static get aliases () { return aliases; }
		static get name () { return "stream"; }
		static get database () { return "stream"; }
		static get table () { return "Stream"; }
	}

	return Stream;
})();
