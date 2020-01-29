module.exports = (function () {
	"use strict";

	class Origin {
		static async list () {
			return await sb.Query.getRecordset(rs => rs
				.select("Origin.Name AS Emote", "Text", "Approved", "Todo")
				.select("User_Alias.Name AS User_Name")
				.from("data", "Origin")
				.join("chat_data", "User_Alias")
			);
		}
	}

	return Origin;
})();