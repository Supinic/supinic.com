module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Origin extends TemplateModule {
		static async fetchAll () {
			const rawData = await super.getAll();
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