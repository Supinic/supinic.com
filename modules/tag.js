module.exports = (function () {
	"use strict";

	class Tag {
		static async list () {
			return await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("music", "Tag")
			);
		}

		static async get (ID) {
			if (!ID) {
				return null;
			}

			return await sb.Query.getRecordset(rs => rs
				.select("Tag.*")
				.select("GROUP_CONCAT(Track_Tag.Track SEPARATOR ',') AS Tracks")
				.from("music", "Tag")
				.leftJoin("music", {
					raw: "music.Track_Tag ON Track_Tag.Tag = Tag.ID"
				})
				.where("Tag.ID = %n", ID)
				.groupBy("Tag.ID")
				.single()
			);
		}
	}

	return Tag;
})();