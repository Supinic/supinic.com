const LinkParser = require("track-link-parser");
let linkParser;

const cacheKeys = {
	SOUNDCLOUD_CLIENT_ID: "soundcloud-client-id"
};

const getLinkParser = async () => {
	if (!linkParser) {
		const options = {};
		if (process.env.API_GOOGLE_YOUTUBE) {
			options.youtube = {
				key: process.env.API_GOOGLE_YOUTUBE
			};
		}
		else {
			console.log("No Youtube API key configured, skipping Youtube parser");
		}

		const soundcloudClientID = await sb.Cache.getByPrefix(cacheKeys.SOUNDCLOUD_CLIENT_ID);
		if (soundcloudClientID) {
			options.soundcloud = {
				key: soundcloudClientID
			};
		}
		else {
			console.log("No Soundcloud client ID key configured, skipping Soundcloud parser");
		}

		if (process.env.BILIBILI_APP_KEY && process.env.BILIBILI_PRIVATE_TOKEN) {
			options.bilibili = {
				appKey: process.env.BILIBILI_APP_KEY,
				token: process.env.BILIBILI_PRIVATE_TOKEN
			};
		}
		else {
			console.log("No Bilibili configuration, skipping Bilibili parser");
		}

		linkParser = new LinkParser(options);
	}

	return linkParser;
};

module.exports = {
	getLinkParser
};
