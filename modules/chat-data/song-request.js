module.exports = (function () {
	const TemplateModule = require("../template.js");

	class SongRequest extends TemplateModule {
		static get statuses () {
			return ["Current", "Inactive", "Queued"];
		}

		static getNormalizedQueue (callback) {
			return sb.Query.getRecordset(rs => {
				rs.select("*")
					.select(`
						(CASE 
							WHEN (Start_Time IS NOT NULL AND End_Time IS NOT NULL) THEN (End_Time - Start_Time)
							WHEN (Start_Time IS NOT NULL AND End_Time IS NULL) THEN (Length - Start_Time)
							WHEN (Start_Time IS NULL AND End_Time IS NOT NULL) THEN (End_Time)
							ELSE Length
							END
						) AS Duration
					`)
					.from("chat_data", "Song_Request");

				if (typeof callback === "function") {
					callback(rs);
				}

				return rs;
			});
		}

		static get name () { return "song-request"; }
		static get database () { return "chat_data"; }
		static get table () { return "Song_Request"; }
	}

	return SongRequest;
})();