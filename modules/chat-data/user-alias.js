module.exports = (function () {
	const TemplateModule = require("../template.js");

	/**
	 * @typedef {Object} UserDataObject
	 * @property {number} ID
	 * @property {string} Name
	 */

	class UserAlias extends TemplateModule {
		/**
		 * @param {string} name
		 * @returns {Promise<UserDataObject|null>}
		 */
		static async getByName (name) {
			const userData = await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("chat_data", "User_Alias")
				.where("Name = %s", name)
				.limit(1)
				.single()
			);

			return userData ?? null;
		}

		/**
		 * @param {number} ID
		 * @returns {Promise<UserDataObject|null>}
		 */
		static async getByID (ID) {
			const userData = await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("chat_data", "User_Alias")
				.where("ID = %n", ID)
				.limit(1)
				.single()
			);

			return userData ?? null;
		}

		static async getDataProperty (userID, propertyName) {
			return await sb.Query.getRecordset(rs => rs
				.select("Value")
				.from("chat_data", "User_Alias_Data")
				.where("Property = %s", propertyName)
				.where("User_Alias = %n", userID)
				.flat("Value")
				.single()
			);
		}

		static async setDataProperty (userID, propertyName, value) {
			const row = await sb.Query.getRow("chat_data", "User_Alias_Data");
			await row.load({ User_Alias: userID, Property: propertyName });

			row.values.Value = value;

			await row.save({ skipLoad: true });
		}

		static get name () { return "user-alias"; }
		static get database () { return "chat_data"; }
		static get table () { return "User_Alias"; }
	}

	return UserAlias;
})();
