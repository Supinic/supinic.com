module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Game extends TemplateModule {
		static async getStreams (gameIdentifier) {
			return await sb.Query.getRecordset(rs => rs
				.select("Timestamp", "Stream_Game.Notes AS Notes")
				.select("Stream.Date AS Date", "Stream.Video_ID AS Stream_ID")
				.select("Stream.Start AS Start", "Stream.End AS End")
				.from("stream", "Stream_Game")
				.join({
					fromDatabase: "stream",
					fromTable: "Stream_Game",
					toDatabase: "stream",
					toTable: "Stream",
					on: "Stream_Game.Stream = Stream.Video_ID"
				})
				.where("Game = %s", gameIdentifier)
			);
		}

		static get name () { return "game"; }
		static get database () { return "stream"; }
		static get table () { return "Game"; }
	}

	return Game;
})();
