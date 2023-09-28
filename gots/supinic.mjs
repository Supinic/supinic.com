export const definition = {
	name: "Supinic",
	optionsType: "object",
	options: {
		prefixUrl: "http://192.168.0.154/api", // @todo move this to some kind of config
		timeout: {
			request: 30000
		}
	},
	parent: "Global",
	description: null
};
