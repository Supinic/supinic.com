module.exports = (function () {
	"use strict";

	class User {
		static async getID (name) {
			return (await sb.Query.getRecordset(rs => rs
				.select("ID")
				.from("chat_data", "User_Alias")
				.where("Name = %s", name)
				.fetch()
			))[0].ID;
		}
	}

	return User;
})();