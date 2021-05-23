module.exports = (function () {
	"use strict";

	// const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	class SlotsWinner extends TemplateModule {
		static async list () {
			return await super.selectMultipleCustom(q => q
				.select("User_Alias.Name AS User_Name")
				.select("Channel.Name AS Channel_Name")
				.join({
					toDatabase: "chat_data",
					toTable: "Channel",
					on: "Slots_Winner.Channel = Channel.ID"
				})
				.join({
					toDatabase: "chat_data",
					toTable: "User_Alias",
					on: "Slots_Winner.User_Alias = User_Alias.ID"
				})
			);
		}

		static get name () { return "slots-winner"; }
		static get database () { return "data"; }
		static get table () { return "Slots_Winner"; }
	}

	return SlotsWinner;
})();
