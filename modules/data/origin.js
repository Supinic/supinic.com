module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Origin extends TemplateModule {
		static async fetch (...IDs) {
			const rawData = await super.selectCustom(q => q
				.select("Origin.ID", "Emote_ID", "Origin.Name", "Tier", "Raffle", "Todo", "Available")
				.select("Type", "Text", "Emote_Added", "Emote_Deleted", "Record_Added", "Notes", "Backup_Link", "Replaced")
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
					"Origin.ID IN %n+",
					IDs
				)
			);

			return rawData.map(i => {
				const url = Origin.parseURL(i);
				const detailUrl = Origin.getEmoteDetailURL(i);

				delete i.Available;
				delete i.Backup_Link;

				return {
					...i,
					Detail_URL: detailUrl,
					url
				};
			});
		}

		static async getRelatedEmotes (ID) {
			const stringReference = `(${ID})`;
			const data = await super.selectCustom(q => q
				.select("ID", "Name")
				.where("Text %*like* OR Notes %*like*", stringReference, stringReference)
			);

			return data.filter(i => i.ID !== ID);
		}

		static async search (name, options = {}) {
			return await super.selectCustom(rs => rs
				.select("ID")
				.where({ condition: (options.exact === true) }, "Name = %s", name)
				.where({ condition: (options.exact === false) }, "Name %*like*", name)
			);
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
			else if (type === "Twitch - Global" || type === "Twitch - Sub" || type === "Twitch - Other") {
				return `https://static-cdn.jtvnw.net/emoticons/v2/${ID}/default/dark/3.0`;
			}
			else if (type === "BTTV" || type === "BTTV - Global" || type === "BTTV - Channel") {
				return `https://cdn.betterttv.net/emote/${ID}/3x`;
			}
			else if (type === "FFZ" || type === "FFZ - Global" || type === "FFZ - Channel") {
				return `https://cdn.frankerfacez.com/emote/${ID}/4`;
			}
			else if (type === "7TV" || type === "7TV - Global" || type === "7TV - Channel") {
				return `https://cdn.7tv.app/emote/${ID}/4x.webp`;
			}
			else if (type === "Discord") {
				return `https://cdn.discordapp.com/emojis/${ID}?v=1`;
			}

			return null;
		}

		static getEmoteDetailURL (item) {
			const ID = item.Emote_ID;
			const type = item.Type;

			if (type.startsWith("Twitch")) {
				// return `https://twitchemotes.com/emotes/${ID}`;
				return `https://emotes.raccatta.cc/twitch/emote/${ID}`;
			}
			else if (type.startsWith("BTTV")) {
				return `https://betterttv.com/emotes/${ID}`;
			}
			else if (type.startsWith("FFZ")) {
				return `https://www.frankerfacez.com/emoticon/${ID}`;
			}
			else if (type.startsWith("7TV")) {
				return `https://7tv.app/emotes/${ID}`;
			}

			return null;
		}

		static get name () { return "origin"; }
		static get database () { return "data"; }
		static get table () { return "Origin"; }
	}

	return Origin;
})();
