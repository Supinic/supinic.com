module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class Origin extends TemplateModule {
		static parseURL (type, ID) {
			if (!ID) {
				return null;
			}

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