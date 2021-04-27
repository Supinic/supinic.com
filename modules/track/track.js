module.exports = (function () {
	"use strict";

	const videoTypePrefix = sb.Config.get("VIDEO_TYPE_REPLACE_PREFIX");
	const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	const Author = require("./author.js");
	const Tag = require("./tag.js");
	const TrackAuthor = require("./track-author.js");
	const TrackTag = require("./track-tag.js");
	const VideoType = require("../data/video-type.js");
	const TrackRelationship = require("./track-relationship.js");
	const UserAlias = require("../chat-data/user-alias.js");

	class Track extends TemplateModule {
		static async list (specificIDs) {
			const rawData = await super.selectMultipleCustom(rs => {
				rs.select("Video_Type.Link_Prefix AS Prefix")
					.select("Gachi.ID AS Legacy_ID")
					.select("COUNT(User_Favourite.Track) AS Favourites")
					.select("GROUP_CONCAT(Track_Tag.Tag SEPARATOR ',') AS Tags")
					.select("GROUP_CONCAT(Track_Author.Author SEPARATOR ',') AS Authors")
					.select("GROUP_CONCAT(Alias.Name SEPARATOR ',') AS Aliases")
					.leftJoin({
						toDatabase: "music",
						toTable: "User_Favourite",
						on: "User_Favourite.Track = Track.ID"
					})
					.leftJoin({
						toDatabase: "music",
						toTable: "Track_Author",
						on: "Track_Author.Track = Track.ID"
					})
					.leftJoin({
						toDatabase: "data",
						toTable: "Gachi",
						on: "Gachi.Link = Track.Link"
					})
					.leftJoin({
						toDatabase: "data",
						toTable: "Video_Type",
						on: "Track.Video_Type = Video_Type.ID"
					})
					.leftJoin({
						toDatabase: "music",
						toTable: "Track_Tag",
						on: "Track_Tag.Track = Track.ID"
					})
					.leftJoin({
						toDatabase: "music",
						toTable: "Alias",
						on: "Alias.Target_Table = 'Track' AND Alias.Target_ID = Track.ID"
					})
					.groupBy("Track.ID");

				if (specificIDs) {
					rs.where("Track.ID IN %n+", specificIDs);
				}

				return rs;
			});

			return rawData.map(row => {
				if (row.Link) {
					row.Parsed_Link = row.Prefix.replace(videoTypePrefix, row.Link);
				}

				delete row.Prefix;

				row.Aliases = (row.Aliases)
					? row.Aliases.split(",")
					: [];

				row.Tags = (row.Tags)
					? row.Tags.split(",").map(Number)
					: [];

				row.Authors = (row.Authors)
					? row.Authors.split(",").map(Number)
					: [];

				return row;
			});
		}

		static async get (ID) {
			const row = await super.getRow(ID);
			if (!row) {
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
				data.Parsed_Link = prefix.replace(videoTypePrefix, row.values.Link);
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

			data.Tags = (await sb.Query.getRecordset(rs => rs
				.select("Name")
				.from("music", "Tag")
				.join({
					toDatabase: "music",
					toTable: "Track_Tag",
					on: "Track_Tag.Tag = Tag.ID"
				})
				.where("Track_Tag.Track = %n", ID)
				.orderBy("Tag.Name ASC")
			)).map(i => i.Name);

			data.Related_Tracks = (await Promise.all([
				sb.Query.getRecordset(rs => rs
					.select("Track_Relationship.Notes AS Notes")
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
					.select("Track_Relationship.Notes AS Notes")
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
				return new Result(false, "No link provided");
			}

			const track = await super.selectSingleCustom(rs => rs.where("Link = %s", link));
			if (track) {
				return await Track.get(track.ID);
			}
			else {
				return false;
			}
		}

		static async search (options = {}) {
			const queries = [];

			if (options.addedByName) {
				const userData = await UserAlias.selectSingleCustom(q => q
					.where("Name = %s", options.addedByName)
				);

				if (!userData) {
					return new Result(false, "addedBy user does not exist");
				}

				queries.push(rs => rs.where("Added_By = %n", userData.ID));
			}

			if (options.addedByID) {
				const userID = Number(options.addedByID);
				queries.push(rs => rs.where("Added_By = %n", userID));
			}

			if (options.name) {
				queries.push(rs => rs.where("Track.Name %*like* OR Alias.Name %*like*", options.name, options.name));
			}

			if (options.authorName) {
				queries.push(rs => rs.where("Author.Name %*like*", options.authorName));
			}

			if (options.authorID) {
				queries.push(rs => rs.where("Author.ID = %n", options.authorID));
			}

			if (options.includeTags) {
				if (!Array.isArray(options.includeTags)) {
					options.includeTags = [options.includeTags];
				}

				const string = [...Array(options.includeTags.length)].fill("Tag.ID = %n").join(" OR ");
				queries.push(rs => rs.where(string, ...options.includeTags));
			}

			if (options.excludeTags) {
				if (!Array.isArray(options.excludeTags)) {
					options.excludeTags = [options.excludeTags];
				}

				const string = [...Array(options.excludeTags.length)].fill("Tag.ID = %n").join(" AND ");
				queries.push(rs => rs.where(string, ...options.excludeTags));
			}

			if (options.hasLegacyID) {
				queries.push(rs => rs.where("Legacy_ID IS NOT NULL"));
			}

			if (options.includeYoutubeReuploads) {
				queries.push(rs => rs
					.select("Youtube_Reupload.ID AS Reupload_ID")
					.reference({
						fromTable: "Track",
						referenceTable: "Track_Relationship",
						referenceFieldSource: "Track_From",
						referenceFieldTarget: "Track_To",
						targetTable: "Track",
						condition: "Video_Type = 1 AND Available = 1",
						targetAlias: "Youtube_Reupload",
						collapseOn: "Track_ID",
						fields: ["Reupload_ID"]
					})
				);
			}

			if (options.specificIDs) {
				queries.push(rs => rs.where("Track.ID IN %n+", options.specificIDs));
			}

			const data = await Track.selectMultipleCustom(rs => {
				rs.select("Track.ID AS Track_ID")
					.select("Tag.Name AS Tag_Name")
					.select("Author.ID AS Author_ID", "Author.Name AS Author_Name")
					.select("Fan.ID AS Fan_ID")
					.select("Alias.Name AS Alias_Name")
					.reference({
						sourceTable: "Track",
						targetTable: "Tag",
						referenceTable: "Track_Tag",
						collapseOn: "Track_ID",
						fields: ["Tag_Name"]
					})
					.reference({
						sourceTable: "Track",
						targetTable: "Author",
						referenceTable: "Track_Author",
						collapseOn: "Track_ID",
						fields: ["Author_ID", "Author_Name"]
					})
					.reference({
						targetAlias: "Fan",
						sourceTable: "Track",
						targetDatabase: "chat_data",
						targetTable: "User_Alias",
						referenceTable: "User_Favourite",
						collapseOn: "Track_ID",
						fields: ["Fan_ID"]
					})
					.reference({
						sourceTable: "Track",
						targetTable: "Alias",
						targetField: "Target_ID",
						collapseOn: "Track_ID",
						fields: ["Alias_Name"],
			            condition: "Alias.Target_Table = 'Track'"
					});

				for (const query of queries) {
					query(rs);
				}

				return rs;
			});

			let targetUserID = null;
			if (options.checkUserIDFavourite) {
				targetUserID = Number(options.checkUserIDFavourite);
			}
			else if (options.checkUsernameFavourite) {
				const userData = await sb.User.get(options.checkUsernameFavourite);
				targetUserID = userData?.ID ?? null;
			}

			await sb.WebUtils.loadVideoTypes();
			for (let i = data.length - 1; i >= 0; i--) {
				const track = data[i];

				track.Parsed_Link = sb.WebUtils.parseVideoLink(track.Video_Type, track.Link);

				track.Favourites = track.Fan?.length ?? 0;
				track.Authors = track.Author.map(i => i.ID);
				track.Tags = track.Tag.map(i => i.Name);
				track.Aliases = track.Alias.map(i => i.Name);
				track.Youtube_Reuploads = (track.Youtube_Reupload)
					? track.Youtube_Reupload.map(i => i.Reupload_ID)
					: null;

				if (targetUserID !== null) {
					if (!track.Fans) {
						track.Is_Favourite = null;
					}
					else {
						track.Is_Favourite = track.Fan.includes(targetUserID);
					}
				}
			}

			return data;
		}

		static async add (options) {
			let {tags = []} = options;
			const {link, addedBy = 1, skipAuthorCheck = false} = options;
			if (!Array.isArray(tags)) {
				tags = [tags];
			}

			let linkData = null;
			try {
				linkData = await sb.Utils.linkParser.fetchData(link);
			}
			catch (e) {
				console.error(e, linkData);
				return new Result(false, "Link could not be parsed");
			}

			if (!linkData) {
				return new Result(false, "Link is not available");
			}

			let authorID = null;
			const author = linkData.authorID;
			const target = (linkData.type === "youtube")
				? "Youtube_Channel_ID"
				: sb.Utils.capitalize(target) + "_ID";

			if (await Track.existsCustom(q => q.where("Link = %s", linkData.ID))) {
				return new Result(false, "Link already exists in the database");
			}

			if (!skipAuthorCheck) {
				const normalizedAuthorName = linkData.author.trim().toLowerCase().replace(/\s+/g, "_");
				const authorCheck = await Author.selectSingleCustom(q => q
					.where("Normalized_Name = %s OR " + target + " = %s", normalizedAuthorName, author)
				);

				if (authorCheck && authorCheck.ID) {
					authorID = authorCheck.ID;
				}
				else {
					const rawData = await Author.insert({
						Name: linkData.author,
						Normalized_Name: normalizedAuthorName,
						[target]: linkData.authorID,
						Added_By: addedBy || 1
					});

					authorID = rawData.insertId;
				}
			}

			const videoType = await VideoType.selectSingleCustom(q => q.where("Parser_Name = %s", linkData.type));
			const trackData = await super.insert({
				Name: linkData.name,
				Link: linkData.ID,
				Track_Type: null,
				Available: true,
				Published: new sb.Date(linkData.created),
				Duration: linkData.duration,
				Added_By: addedBy,
				Video_Type: videoType.ID
			});

			console.log("New track data", trackData);

			if (!skipAuthorCheck) {
				const linkResult = await TrackAuthor.link({
					trackID: trackData.insertId,
					authorID: authorID,
					user: addedBy,
					role: "Uploader"
				});

				if (linkResult instanceof Result && !linkResult.success) {
					return linkResult;
				}
			}

			await Promise.all(tags.map(tag => TrackTag.link(trackData.insertId, tag, addedBy)));

			return new Result(true, "Added new track as ID " + trackData.insertId, { ID: trackData.insertId });
		}

		static async addReupload (existingID, reuploadLink, addedBy = 1) {
			if (!sb.Utils.isValidInteger(existingID)) {
				return new Result(false, "Existing track ID is not in the correct format");
			}
			else if (!await Track.exists(existingID)) {
				return new Result(false, "Existing track ID does not exist");
			}

			let parsedLink = null;
			try {
				parsedLink = sb.Utils.linkParser.parseLink(reuploadLink);
			}
			catch (e) {
				console.error(e);
				return new Result(false, "Could not parse reupload link");
			}

			if (parsedLink === null) {
				return new Result(false, "Could not parse reupload link");
			}

			const [reuploadTag, todoTag, existingTrackData] = await Promise.all([
				Tag.selectSingleCustom(q => q.where("Name = %s", "Reupload")),
				Tag.selectSingleCustom(q => q.where("Name = %s", "Todo")),
			    Track.selectSingleCustom(q => q.where("Link = %s", parsedLink))
			]);

			let reuploadID = null;
			if (existingTrackData) {
				reuploadID = existingTrackData.ID;
			}
			else {
				const addResult = await Track.add(reuploadLink, reuploadTag.ID, addedBy);
				if (!addResult.success) {
					return new Result(false, "Could not add a new track", null, addResult);
				}

				console.log("Add result: ", addResult);

				reuploadID = addResult.data.ID;
			}

			const relationshipResult = await TrackRelationship.link(reuploadID, "Reupload of", existingID, addedBy);
			if (!relationshipResult.success && relationshipResult.string.includes("already exists")) {
				return new Result(true, "Reupload link is already connected to main track link, no changes necessary");
			}

			console.log(reuploadID, reuploadTag, todoTag, addedBy);

			const results = await Promise.all([
				TrackTag.link(reuploadID, reuploadTag.ID, addedBy),
				TrackTag.unlink(reuploadID, todoTag.ID)
			]);

			console.log(results);

			return (existingTrackData)
				? new Result(true, "Tracks linked together successfully", { ID: reuploadID })
				: new Result(true, "Reupload track created and linked successfully", { ID: reuploadID })
		}

		static get name () { return "track"; }
		static get database () { return "music"; }
		static get table () { return "Track"; }
	}

	return Track;
})();