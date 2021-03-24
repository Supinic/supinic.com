module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Portfolio extends TemplateModule {
		static async getList () {
			return await super.selectMultipleCustom(q => q
				.select("User_Alias.Name AS Owner_Name")
				.select("GET_PORTFOLIO_TOTAL_PRICE(Portfolio.ID) AS Converted_Total")
				.where("Active = %b", true)
				.join({
					toDatabase: "chat_data",
					toTable: "User_Alias",
					on: "Portfolio.Owner = User_Alias.ID"
				})
			);
		}

		static get name () { return "portfolio"; }
		static get database () { return "crypto_game"; }
		static get table () { return "Portfolio"; }
	}

	return Portfolio;
})();