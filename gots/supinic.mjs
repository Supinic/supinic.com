export const definition = {
	name: "Supinic",
	optionsType: "object",
	options: {
		prefixUrl: "http://localhost/api", // @todo move this to some kind of config
		timeout: {
			request: 30000
		}
	},
	parent: "Global",
	description: null
};
