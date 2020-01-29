module.exports = (function () {
	"use strict";

	class Command {
		static async getAll () {
			return await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("chat_data", "Command")
			);
		}
	}

	return Command;
})();