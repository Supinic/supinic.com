module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Game extends TemplateModule {
		static async getComments (gameIdentifier) {
			return await sb.Query.getRecordset(rs => rs
			    .select("User_Alias", "Created", "Text")
				.select("User_Alias.Name AS Username")
				.from("stream", "Game_Comment")
				.join({
					toDatabase: "chat_data",
					toTable: "User_Alias"
				})
			    .from("stream", "Game_Comment")
				.where("Game = %s", gameIdentifier)
			);
		}

		static async getStreams (gameIdentifier) {
			return await sb.Query.getRecordset(rs => rs
				.select("Timestamp", "Notes")
				.select("Stream.Date AS Date", "Stream.Video_ID AS Stream_ID")
				.select("Stream.Start AS Start", "Stream.End AS End")
				.from("stream", "Stream_Game")
				.join({
					toTable: "Stream",
					on: "Stream_Game.Stream = Stream.Video_ID"
				})
				.from("stream", "Game_Comment")
				.where("Game = %s", gameIdentifier)
			);
		}

		static get name () { return "game"; }
		static get database () { return "stream"; }
		static get table () { return "Game"; }
	}

	return Game;
})();