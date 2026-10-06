module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Origin extends TemplateModule {
		static async fetch (...IDs) {
			const rawData = await super.selectCustom(q => q
				.select("Origin.ID as ID", "Emote_ID AS emoteId", "Origin.Name AS name", "Tier AS tier", "Raffle AS raffle", "Todo AS todo", "Available AS available")
				.select("Type AS type", "Text AS text", "Emote_Added AS emoteAdded", "Emote_Deleted AS emoteDeleted", "Record_Added AS recordAdded", "Notes AS notes", "Backup_Link AS backupLink", "Replaced AS replaced")
				.select("Author.Name AS authorName")
				.select("Reporter.Name AS reporterName")
				.select("Raffle_Winner.Name AS raffleWinnerName")
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
				.flat("ID")
			);
		}

		static parseURL (item) {
			if (item.available === "Backup" && item.backupLink) {
				return item.backupLink;
			}
			else if (item.available === null || item.available === "None") {
				return null;
			}
			else if (!item.emoteId || item.available !== "Original") {
				return null;
			}

			const { emoteId, type } = item;
			switch (type) {
				case "Twitch - Bits": {
					return `https://static-cdn.jtvnw.net/emoticons/v1/${emoteId}/3.0`;
				}

				case "Twitch - Global":
				case "Twitch - Sub":
				case "Twitch - Other": {
					return `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/3.0`;
				}

				case "BTTV":
				case "BTTV - Global":
				case "BTTV - Channel": {
					return `https://cdn.betterttv.net/emote/${emoteId}/3x`;
				}

				case "FFZ":
				case "FFZ - Global":
				case "FFZ - Channel": {
					return `https://cdn.frankerfacez.com/emote/${emoteId}/4`;
				}

				case "7TV":
				case "7TV - Global":
				case "7TV - Channel": {
					return `https://cdn.7tv.app/emote/${emoteId}/4x.webp`;
				}

				case "Discord": {
					return `https://cdn.discordapp.com/emojis/${emoteId}?v=1`;
				}
			}

			return null;
		}

		static getEmoteDetailURL (item) {
			const { emoteId, type } = item;
			if (type.startsWith("Twitch")) {
				// return `https://twitchemotes.com/emotes/${ID}`;
				// return `https://emotes.awoo.nl/twitch/emote/${ID}`;
				return `https://chatvau.lt/emote/twitch/${emoteId}`;
			}
			else if (type.startsWith("BTTV")) {
				return `https://betterttv.com/emotes/${emoteId}`;
			}
			else if (type.startsWith("FFZ")) {
				return `https://www.frankerfacez.com/emoticon/${emoteId}`;
			}
			else if (type.startsWith("7TV")) {
				return `https://7tv.app/emotes/${emoteId}`;
			}

			return null;
		}

		static get name () { return "origin"; }
		static get database () { return "data"; }
		static get table () { return "Origin"; }
	}

	return Origin;
})();
