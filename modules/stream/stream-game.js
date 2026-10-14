module.exports = (function () {
	const TemplateModule = require("../template.js");

	const aliases = [
		"Stream_Game.Notes AS notes",
		"Stream_Game.Timestamp AS timestamp"
	];

	class StreamGame extends TemplateModule {
		static async getForGame (gameName) {
			return await super.selectMultipleCustom(q => q
				.select("Stream.Date AS date", "Stream.Video_ID AS streamId")
				.join({
					fromDatabase: "stream",
					fromTable: "Stream_Game",
					toDatabase: "stream",
					toTable: "Stream",
					on: "Stream_Game.Stream = Stream.Video_ID"
				})
				.where("Stream_Game.Game = %s", gameName)
			);
		}

		static get aliases () { return aliases; }
		static get name () { return "stream-game"; }
		static get database () { return "stream"; }
		static get table () { return "Stream_Game"; }
	}

	return StreamGame;
})();
