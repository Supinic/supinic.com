const LinkParser = require("track-link-parser");
let linkParser;

const getLinkParser = () => {
	if (!linkParser) {
		const options = {};
		if (process.env.API_GOOGLE_YOUTUBE) {
			options.youtube = {
				key: process.env.API_GOOGLE_YOUTUBE
			};
		}
		else {
			console.warn("LinkParser: No YouTube API key configured - skipping");
		}

		if (process.env.SOUNDCLOUD_CLIENT_ID) {
			options.soundcloud = {
				key: process.env.SOUNDCLOUD_CLIENT_ID
			};
		}
		else {
			console.warn("LinkParser: No Soundcloud API key configured - skipping");
		}

		if (process.env.BILIBILI_APP_KEY && process.env.BILIBILI_PRIVATE_TOKEN) {
			options.bilibili = {
				appKey: process.env.BILIBILI_APP_KEY,
				token: process.env.BILIBILI_PRIVATE_TOKEN
			};
		}
		else {
			console.warn("LinkParser: No Bilibili API keys configured - skipping");
		}

		linkParser = new LinkParser(options);
	}

	return linkParser;
};

module.exports = {
	getLinkParser
};
