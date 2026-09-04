export const definition = {
	name: "Supibot",
	options: (() => {
		const url = process.env.SUPIBOT_API_BASE_URL;
		if (!url) {
			throw new sb.Error({
				messsage: "No Supibot API URL configured"
			});
		}

		return {
			prefixUrl: process.env.SUPIBOT_API_BASE_URL,
			allowAbsoluteUrls: false
		};
	}),
	parent: "Global"
};
