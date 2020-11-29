module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");
	const TrackAuthor = require("./track-author.js");
	const Alias = require("./alias.js");

	class Author extends TemplateModule {
		static async list () {
			const data = await super.selectMultipleCustom(rs => rs
				.select("GROUP_CONCAT(Alias.Name SEPARATOR ',') AS Aliases")
				.select("Country.Name AS Country_Name")
				.leftJoin("data", "Country")
				.leftJoin({
					toDatabase: "music",
					toTable: "Alias",
					on: "Alias.Target_Table = 'Author' AND Alias.Target_ID = Author.ID"
				})
				.groupBy("Author.ID")
				.orderBy("Author.Name ASC")
			);

			return data.map(row => {
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
			const row = await super.getRow(ID);
			if (row === null) {
				return null;
			}

			const data = Object.assign({}, row.valuesObject);
			if (row.values.Country) {
				data.Country = (await sb.Query.getRecordset(rs => rs
					.select("Name")
					.from("data", "Country")
					.where("ID = %n", row.values.Country)
					.single()
				)).Name;
			}

			data.Aliases = (await sb.Query.getRecordset(rs => rs
				.select("Name")
				.from("music", "Alias")
				.where("Target_Table = %s", "Author")
				.where("Target_ID = %n", ID)
			)).map(i => i.Name);

			data.Tracks = await sb.Query.getRecordset(rs => rs
				.select("Role")
				.select("Track.ID AS ID", "Track.Name AS Name", "Track.Published AS Published")
				.from("music", "Track_Author")
				.join("music", "Track")
				.where("Author = %n", ID)
			);

			const contactData = await sb.Query.getRecordset(rs => rs
				.select("Identifier", "Display_Name")
				.select("Website.Name AS Website", "Website.Link_Prefix AS Prefix")
				.from("music", "Author_Website")
				.join({
					toTable: "Website",
					on: "Author_Website.Website = Website.Name"
				})
				.where("Author_Website.Author = %n", ID)
			);

			data.Contacts = contactData.map(i => ({
				Website: i.Website,
				Name: i.Display_Name ?? i.Identifier,
				Display_Name: i.Display_Name,
				Identifier: i.Identifier,
				link: (i.Prefix)
					? i.Prefix.replace("$", i.Identifier)
					: null
			}));

			return data;
		}

		static async createAlias (authorID, alias) {
			if (!sb.Utils.isValidInteger(authorID) || typeof alias !== "string" || !alias) {
				throw new sb.Error({
					message: "Missing or invalid options",
					args: arguments
				});
			}

			if (!(await super.exists(authorID))) {
				return false;
			}

			await Alias.insert({
				Target_Table: "Author",
				Target_ID: authorID,
				Name: alias
			});

			return true;
		}

		static async convertExistingToAlias (options = {}) {
			const {removeAuthorID, existingAuthorID} = options;
			if (!sb.Utils.isValidInteger(removeAuthorID) || !sb.Utils.isValidInteger(existingAuthorID)) {
				throw new sb.Error({
					message: "Missing or invalid mandatory options",
					args: options
				});
			}

			const exists = (await Promise.all([
				Author.exists(removeAuthorID),
				Author.exists(existingAuthorID)
			])).every(Boolean);

			if (!exists) {
				return false;
			}

			await TrackAuthor.updateCustom(
				{ Author: existingAuthorID },
				rs => rs.where("Author = %n", existingAuthorID)
			);

			const removeRow = await super.getRow(removeAuthorID);
			await Alias.insert({
				Target_Table: "Author",
				Target_ID: existingAuthorID,
				Name: removeRow.values.Name
			});

			await Author.delete(removeAuthorID);
			return true;
		}

		static async search (options = {}) {
			let data = await Author.list();

			if (options.country) {
				options.country = options.country.toLowerCase();
				data = data.filter(i => i.countryName && i.countryName.toLowerCase() === options.country);
			}

			if (options.name) {
				options.name = options.name.toLowerCase();
				data = data.filter(i => i.Name && i.Name.toLowerCase().includes(options.name));
			}

			if (options.normalizedName) {
				options.normalizedName = options.normalizedName.toLowerCase();
				data = data.filter(i => i.Normalized_Name && i.Normalized_Name.toLowerCase().includes(options.normalizedName));
			}

			return data;
		}

		static get name () { return "author"; }
		static get database () { return "music"; }
		static get table () { return "Author"; }
	}

	return Author;
})();