module.exports = (function () {
	const TemplateModule = require("../template.js");

	class CommandExecution extends TemplateModule {
		static async hourlyStats () {
			const data = await super.selectMultipleCustom(rs => rs
				.select("COUNT(*) AS Amount")
				.groupBy("HOUR(Executed)")
				.orderBy("HOUR(Executed) ASC")
				.where("Executed >= DATE_ADD(NOW(), INTERVAL -1 DAY)")
			);

			return data.map(i => i.Amount);
		}

		static get name () { return "command-execution"; }
		static get database () { return "chat_data"; }
		static get table () { return "Command_Execution"; }
	}

	return CommandExecution;
})();