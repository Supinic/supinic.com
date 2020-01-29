module.exports = (function () {
	"use strict";

	class Track {
		static async list () {
			return await sb.Query.getRecordset(rs => rs
				.select("Track.*")
				.select("Video_Type.Link_Prefix AS Prefix")
				.select("Gachi.ID AS Legacy_ID")
				.select("GROUP_CONCAT(Track_Tag.Tag SEPARATOR ',') AS Tags")
				.from("music", "Track")
				.leftJoin("data", {
					raw: "data.Gachi ON Gachi.Link = Track.Link"
				})
				.leftJoin("data", {
					raw: "data.Video_Type ON Track.Video_Type = Video_Type.ID"
				})
				.leftJoin("music", {
					raw: "music.Track_Tag ON Track_Tag.Track = Track.ID"
				})
				.groupBy("Track.ID")
			);
		}

		static async get (ID) {
			const row = await sb.Query.getRow("music", "Track");
			try {
				await row.load(ID);
			}
			catch {
				return null;
			}

			const data = Object.assign({}, row.valuesObject);
			const prefix = (await sb.Query.getRecordset(rs => rs
				.select("Link_Prefix")
				.from("data", "Video_Type")
				.where("ID = %n", row.values.Video_Type)
				.single()
			)).Link_Prefix;

			data.Added_By = "N/A";
			if (row.values.Added_By) {
				const userData = await sb.Query.getRow("chat_data", "User_Alias");
				await userData.load(row.values.Added_By);
				data.Added_By = userData.values.Name;
			}

			data.Parsed_Link = "N/A";
			if (row.values.Link) {
				data.Parsed_Link = prefix.replace("$", row.values.Link);
			}

			data.Aliases = (await sb.Query.getRecordset(rs => rs
				.select("Name AS Alias")
				.from("music", "Alias")
				.where("Target_Table = %s", "Track")
				.where("Target_ID = %n", ID)
			)).map(i => i.Alias);

			data.Authors = await sb.Query.getRecordset(rs => rs
				.select("LOWER(Role) AS Role")
				.select("Author.ID AS ID", "Author.Name AS Name")
				.from("music", "Track_Author")
				.join("music", "Author")
				.where("Track = %n", ID)
			);

			data.Related_Tracks = (await Promise.all([
				sb.Query.getRecordset(rs => rs
					.select("LOWER(Relationship) AS Relationship")
					.select("Track_From AS From_ID")
					.select("Target.ID AS To_ID", "Target.Name AS Name")
					.from("music", "Track_Relationship")
					.join("music", {
						raw: "music.Track AS Target ON Track_Relationship.Track_To = Target.ID"
					})
					.where("Track_From = %n", ID)
				),
				sb.Query.getRecordset(rs => rs
					.select("LOWER(Relationship) AS Relationship")
					.select("Track_To AS To_ID")
					.select("Target.ID AS From_ID", "Target.Name AS Name")
					.from("music", "Track_Relationship")
					.join("music", {
						raw: "music.Track AS Target ON Track_Relationship.Track_From = Target.ID"
					})
					.where("Track_To = %n", ID)
				)
			])).flat();

			const legacy = (await sb.Query.getRecordset(rs => rs
				.select("Gachi.ID AS ID")
				.from("data", "Gachi")
				.join("music", {
					raw: "music.Track on Gachi.Link = Track.Link"
				})
				.where("Track.Link = %s", row.values.Link)
				.single()
			));
			data.Legacy_ID = (legacy && legacy.ID) || null;

			return data;
		}

		static async present (link) {
			if (!link) {
				return null;
			}

			const track = await sb.Query.getRecordset(rs => rs
				.select("ID")
				.from("music", "Track")
				.where("Link = %s", link)
				.single()
			);

			if (track) {
				return await Track.get(track.ID);
			}
			else {
				return false;
			}
		}

		static async listByTag (tags) {
			if (!tags) {
				return await Track.list();
			}

			return await sb.Query.getRecordset(rs => rs
				.select("Track.*")
				.select("Video_Type.Link_Prefix AS Prefix")
				.select("Gachi.ID AS Legacy_ID")
				.select("GROUP_CONCAT(Track_Tag.Tag SEPARATOR ',') AS Tags")
				.from("music", "Track")
				.leftJoin("data", {
					raw: "data.Gachi ON Gachi.Link = Track.Link"
				})
				.leftJoin("data", {
					raw: "data.Video_Type ON Track.Video_Type = Video_Type.ID"
				})
				.leftJoin("music", {
					raw: "music.Track_Tag ON Track_Tag.Track = Track.ID"
				})
				.where(tags.map(tagID => "Track_Tag.Tag = " + tagID).join(" AND "))
				.groupBy("Track.ID")
			);
		}
	}

	return Track;
})();