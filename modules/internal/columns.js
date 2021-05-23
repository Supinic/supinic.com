module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Columns extends TemplateModule {
		static async getEnumColumnOptions (database, table, column) {
			const data = await super.selectSingleCustom(q => q
				.where("TABLE_SCHEMA = %s", database)
				.where("TABLE_NAME = %s", table)
				.where("COLUMN_NAME = %s", column)
				.where("DATA_TYPE = %s", "enum")
			);

			if (!data) {
				return null;
			}
			else {
				return data.COLUMN_TYPE.replace(/enum\(|\)|'/g, "").split(",").sort();
			}
		}

		static get name () { return "columns"; }
		static get database () { return "information_schema"; }
		static get table () { return "columns"; }
	}

	return Columns;
})();
