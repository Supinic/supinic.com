module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Origin extends TemplateModule {
		static async fetch (...IDs) {
			const rawData = await super.selectCustom(q => q
				.select("Origin.ID", "Emote_ID", "Origin.Name", "Tier", "Raffle", "Todo", "Approved")
				.select("Emote_Added", "Record_Added", "Notes")
				.select("Author.Name AS Author")
				.select("Reporter.Name AS Reporter")
				.select("Raffle_Winner.Name AS Raffle_Winner")
				.leftJoin({
					alias: "Author",
					toDatabase: "chat_data",
					toTable: "User_Alias",
					on: "Origin.Author = Author.ID"
				})
				.leftJoin({
					alias: "Reporter",
					toDatabase: "chat_data",
					toTable: "User_Alias",
					on: "Origin.User_Alias = Reporter.ID"
				})
				.leftJoin({
					alias: "Raffle_Winner",
					toDatabase: "chat_data",
					toTable: "User_Alias",
					on: "Origin.Raffle_Winner = Raffle_Winner.ID"
				})
				.where(
					{ condition: (IDs.length !== 0) },
					"Origin.ID IN %n+", IDs
				)
			);

			return rawData.map(i => ({
				...i,
				url: Origin.parseURL(i)
			}));
		}

		static parseURL (item) {
			if (item.Available === "Backup" && item.Backup_Link) {
				return item.Backup_Link;
			}
			else if (item.Available === null || item.Available === "None") {
				return null;
			}
			else if (!item.Emote_ID || item.Available !== "Original") {
				return null;
			}

			const ID = item.Emote_ID;
			const type = item.Type;
			if (type === "Twitch - Bits") {
				return `https://static-cdn.jtvnw.net/emoticons/v1/${ID}/3.0`;
			}
			else if (type === "Twitch - Global" || type === "Twitch - Sub") {
				return `https://static-cdn.jtvnw.net/emoticons/v2/${ID}/default/dark/3.0`;
			}
			else if (type === "BTTV") {
				return `https://cdn.betterttv.net/emote/${ID}/3x`;
			}
			else if (type === "FFZ") {
				return `https://cdn.betterttv.net/emote/${ID}/3x`;
			}
			else if (type === "Discord") {
				return `https://cdn.discordapp.com/emojis/${ID}?v=1`;
			}

			return null;
		}

		static get name () { return "origin"; }
		static get database () { return "data"; }
		static get table () { return "Origin"; }
	}

	return Origin;
})();