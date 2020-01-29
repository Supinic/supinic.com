module.exports = (function () {
	"use strict";

	const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	let Track = null;
	let Tag = null;

	class TrackTag extends TemplateModule {
		static async get (tagID, trackID) {
			if (!sb.Utils.isValidInteger(tagID) || !sb.Utils.isValidInteger(trackID)) {
				return new Result(false, "Invalid ID format");
			}

			return await super.selectSingleCustom(q => q
				.where("Track = %n", trackID)
				.where("Tag = %n", tagID)
			);
		}

		static async link (trackID, tagID, user = 1, notes = null) {
			Tag = Tag || require("./tag.js");
			Track = Track || require("./track.js");

			if (!sb.Utils.isValidInteger(trackID) || !sb.Utils.isValidInteger(tagID)) {
				return new Result(false, "Track-Tag link: Invalid Track/Tag ID format");
			}
			else if (!await Track.exists(trackID)) {
				return new Result(false, "Track-Tag link: Track ID does not exist");
			}
			else if (!await Tag.exists(tagID)) {
				return new Result(false, "Track-Tag link: Tag ID does not exist");
			}
			else if (await TrackTag.existsCustom(q => q.where("Track = %n AND Tag = %n", trackID, tagID))) {
				return new Result(false, "Track-Tag link: Track-Tag link exists");
			}

			await super.insert({
				Track: trackID,
				Tag: tagID,
				Notes: notes,
				Added_By: user
			});

			return new Result(true, `Track ID ${trackID} and Tag ID ${tagID} linked successfully`);
		}

		static async unlink (trackID, tagID) {
			Tag = Tag || require("./tag.js");
			Track = Track || require("./track.js");

			if (!sb.Utils.isValidInteger(trackID) || !sb.Utils.isValidInteger(tagID)) {
				return new Result(false, "Track-Tag unlink: Invalid Track/Tag ID format");
			}
			else if (!await Track.exists(trackID)) {
				return new Result(false, "Track-Tag unlink: Track ID does not exist");
			}
			else if (!await Tag.exists(tagID)) {
				return new Result(false, "Track-Tag unlink: Tag ID does not exist");
			}
			else if (!await TrackTag.existsCustom(q => q.where("Track = %n AND Tag = %n", trackID, tagID))) {
				return new Result(false, "Track-Tag unlink: No Track-Tag link exists");
			}

			await super.deleteCustom(q => q.where("Track = %n AND Tag = %n", trackID, tagID));
			return new Result(true, `Track ID ${trackID} and Tag ID ${tagID} unlinked successfully`);
		}

		static get name () { return "track-tag"; }
		static get database () { return "music"; }
		static get table () { return "Track_Tag"; }
	}

	return TrackTag;
})();
