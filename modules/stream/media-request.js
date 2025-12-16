module.exports = (function () {
	const TemplateModule = require("../template.js");

	class MediaRequest extends TemplateModule {
		static async getHistoryQueue (threshold) {
			const date = (threshold)
				? new sb.Date(threshold)
				: new sb.Date().addDays(-7);

			return await sb.Query.getRecordset(rs => rs
				.select("Media_Request.ID AS MID", "PID", "URL", "Media_Request.Name AS Name", "Added")
				.select("User_Alias.Name AS Username")
				.from("stream", "Media_Request")
				.leftJoin({
					fromDatabase: "stream",
					fromTable: "Media_Request",
					fromField: "Request",
					toDatabase: "chat_data",
					toTable: "User_Alias",
					toField: "ID"
				})
				.where("Added >= %d", date)
			);
		}

		static get name () { return "media-request"; }
		static get database () { return "stream"; }
		static get table () { return "Media_Request"; }
	}

	return MediaRequest;
})();
