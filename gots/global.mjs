export const definition = {
	name: "Global",
	optionsType: "function",
	options: (() => ({
		responseType: "json",
		retry: {
			limit: 0
		},
		timeout: {
			request: 30000
		},
		mutableDefaults: true,
		throwHttpErrors: false,
		headers: {
			"User-Agent": `https://supinic.com server request`
		}
	})),
	parent: null,
	description: "Global definition - template for all others"
};
