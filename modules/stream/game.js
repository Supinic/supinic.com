module.exports = (function () {
	const TemplateModule = require("../template.js");

	const aliases = [
		"Game.Name as name",
		"Game.Released as releaseDate",
		"Game.Genre AS genres",
		"Game.Status as status",
		"Game.Completion_Time as completionTime",
		"Game.Priority as priority",
		"Game.Steam_ID as steamId",
		"Game.Identifier as ID"
	];

	class Game extends TemplateModule {
		static get aliases () { return aliases; }
		static get name () { return "game"; }
		static get database () { return "stream"; }
		static get table () { return "Game"; }
	}

	return Game;
})();
