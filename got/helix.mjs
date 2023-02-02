export const definition = {
	name: "Helix",
	optionsType: "function",
	options: (() => {
		const token = sb.Config.get("TWITCH_OAUTH");
		return {
			prefixUrl: "https://api.twitch.tv/helix/",
			responseType: "json",
			throwHttpErrors: false,
			headers: {
				Authorization: `Bearer ${token.replace("oauth:", "")}`,
				"Client-ID": sb.Config.get("TWITCH_CLIENT_ID")
			}
		};
	}),
	parent: "Global",
	description: "Twitch Helix API definition"
};
