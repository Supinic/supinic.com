export const definition = {
	name: "Supinic",
	options: {
		prefixUrl: "http://localhost/api", // @todo move this to some kind of config,
		allowAbsoluteUrls: false,
		timeout: {
			request: 30000
		}
	},
	parent: "Global"
};
