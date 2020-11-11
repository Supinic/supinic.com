module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Game extends TemplateModule {
		static get name () { return "game"; }
		static get database () { return "stream"; }
		static get table () { return "Game"; }
	}

	return Game;
})();