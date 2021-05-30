module.exports = (function () {
	"use strict";

	class Author {
		static async list () {
			const rawData = await sb.Query.getRecordset(rs => rs
				.select("Author.ID", "Author.Name", "Author.Normalized_Name")
				.select("Author.Youtube_User_ID", "Author.Youtube_Channel_ID", "Author.Youtube_Name")
				.select("GROUP_CONCAT(Track_Author.Role SEPARATOR ',') AS Roles")
				.select("GROUP_CONCAT(Alias.Name SEPARATOR ',') AS Aliases")
				.select("Country.Name AS Country")
				.from("music", "Author")
				.leftJoin("data", "Country")
				.leftJoin("music", {
					raw: "music.Alias ON Alias.Target_Table = 'Author' AND Alias.Target_ID = Author.ID"
				})
				.leftJoin("music", {
					raw: "music.Track_Author ON Author.ID = Track_Author.Author"
				})
				.groupBy("Author.ID")
				.orderBy("Author.Name ASC")
			);

			return rawData.map(row => {
				const roles = {};

				row.Roles.split(",").forEach(role => {
					if (!roles[role]) {
						roles[role] = 1;
					}
					else {
						roles[role] += 1;
					}
				});
				row.Roles = roles;

				if (row.Aliases === null) {
					row.Aliases = [];
				}
				else {
					row.Aliases = row.Aliases.split(",");
				}

				return row;
			});
		}

		static async get (ID) {
			const row = await sb.Query.getRow("music", "Author");
			try {
				await row.load(ID);
			}
			catch {
				return null;
			}

			const data = { ...row.valuesObject };
			const aliasData = await sb.Query.getRecordset(rs => rs
				.select("Name")
				.from("music", "Alias")
				.where("Target_Table = %s", "Author")
				.where("Target_ID = %n", ID)
			);

			data.Aliases = (aliasData.length > 0)
				? aliasData.map(i => i.Name)
				: [];

			if (row.values.Country) {
				const countryData = await sb.Query.getRecordset(rs => rs
					.select("Name")
					.from("data", "Country")
					.where("ID = %n", row.values.Country)
					.single()
				);

				data.Country = countryData.Name;
			}

			const trackData = await sb.Query.getRecordset(rs => rs
				.select("Role")
				.select("Track.ID AS ID", "Track.Name AS Name", "Track.Published AS Published")
				.from("music", "Track_Author")
				.join("music", "Track")
				.where("Author = %n", ID)
			);

			data.Tracks = (trackData.length > 0)
				? trackData.map(i => ({
					Name: i.Name,
					ID: i.ID,
					Role: i.Role,
					Published: i.Published
				}))
				: [];

			if (row.values.User_Alias) {
				const userData = await sb.Query.getRow("chat_data", "User_Alias");
				await userData.load(row.values.User_Alias);

				data.User_Alias = {
					ID: userData.values.ID,
					Name: userData.values.Name
				};
			}

			return data;
		}

		static async edit (ID, data) {
			const row = await sb.Query.getRow("music", "Author");
			try {
				await row.load(ID);
			}
			catch {
				return null;
			}

			try {
				row.valuesObject = Object.assign(data, row.valuesObject);
				await row.save();
			}
			catch {
				return null;
			}

			return true;
		}

		static async create (data) {
			const row = await sb.Query.getRow("music", "Author");
			try {
				row.valuesObject = Object.assign(data, row.valuesObject);
				await row.save();
			}
			catch {
				return null;
			}

			return true;
		}
	}

	return Author;
})();
