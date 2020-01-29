module.exports = (function () {
	"use strict";

	class Playsound {
		static async getAll () {
			return await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("data", "Playsound")
			);
		}
	}

	return Playsound;
})();