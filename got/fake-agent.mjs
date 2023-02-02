export const definition = {
	name: "FakeAgent",
	optionsType: "object",
	options: {
		responseType: "text",
		throwHttpErrors: false,
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
		}
	},
	parent: null,
	description: "Pretends to be a browser request, mostly used for scraping"
};
