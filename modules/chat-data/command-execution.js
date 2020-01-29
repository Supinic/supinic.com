module.exports = (function () {
	const TemplateModule = require("../template.js");

	class CommandExecution extends TemplateModule {
		static async hourlyStats () {
			const data = await super.selectMultipleCustom(rs => rs
				.select("COUNT(*) AS `Count`")
				.groupBy("HOUR(Executed)")
				.orderBy("HOUR(Executed) ASC")
			);

			return data.map(i => i.Count);
		}

		static first () {

		}

		/*
		 SELECT Command.Name, COUNT(*)
		 FROM Command_Execution
		 JOIN Command ON Command.ID = Command
		 GROUP BY Command
		 */

		static get name () { return "command-execution"; }
		static get database () { return "chat_data"; }
		static get table () { return "Command_Execution"; }
	}

	return CommandExecution;
})();