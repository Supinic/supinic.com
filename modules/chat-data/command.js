module.exports = (function () {
	const TemplateModule = require("../template.js");
	// const Result = require("../result.js");

	class Command extends TemplateModule {
		static async hourlyStats () {
			return await super.selectMultipleCustom(rs => rs
				.select("HOUR(Executed) AS `Hour`")
				.select("COUNT(*) AS `Count`")
				.groupBy("HOUR(Executed)")
			);
		}

		static get name () { return "command"; }
		static get database () { return "chat_data"; }
		static get table () { return "Command"; }
	}

	return Command;
})();