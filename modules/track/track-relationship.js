module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");
	const Result = require("../result.js");

	let Track = null;

	class TrackRelationship extends TemplateModule {
		static async link (fromID, relationship, toID, user = 1, notes = null) {
			Track = Track || require("./track.js");

			if (!sb.Utils.isValidInteger(fromID) || !sb.Utils.isValidInteger(toID)) {
				return new Result(false, "Track-Relationship link: Invalid Track/Relationship ID format");
			}
			else if (!relationship) {
				return new Result(false, "Track-Relationship link: No relationship provided");
			}
			else if (!await Track.exists(fromID)) {
				return new Result(false, "Track-Relationship link: From track ID does not exist");
			}
			else if (!await Track.exists(toID)) {
				return new Result(false, "Track-Relationship link: To track ID does not exist");
			}
			else if (await TrackRelationship.existsCustom(q => q
				.where("Track_From = %n", fromID)
				.where("Relationship = %s", relationship)
				.where("Track_To = %n", toID)
			)) {
				return new Result(false, "Track-Relationship link: Link between tracks already exists");
			}

			await super.insert({
				Track_From: fromID,
				Relationship: relationship,
				Track_To: toID,
				Notes: notes,
				Added_By: user
			});

			return new Result(true, `Tracks from ID ${fromID} and to ID ${toID} linked successfully`);
		}

		static async unlink (fromID, relationship, toID) {
			Track = Track || require("./track.js");

			if (!sb.Utils.isValidInteger(fromID) || !sb.Utils.isValidInteger(toID)) {
				return new Result(false, "Track-Relationship unlink: Invalid ID format");
			}
			else if (!relationship) {
				return new Result(false, "Track-Relationship unlink: No relationship provided");
			}
			else if (!await Track.exists(fromID)) {
				return new Result(false, "Track-Relationship unlink: From track ID does not exist");
			}
			else if (!await Track.exists(toID)) {
				return new Result(false, "Track-Relationship unlink: To track ID does not exist");
			}
			else if (await TrackRelationship.existsCustom(q => q.where("Track_From = %n AND Track_To = %n"), fromID, toID)) {
				return new Result(false, "Track-Relationship unlink: Link between tracks already exists");
			}

			await super.deleteCustom(q => q.where("Track = %n AND Tag = %n"));
			return new Result(true, `Track ID ${fromID} and Tag ID ${toID} unlinked successfully`);
		}

		static get name () { return "track-relationship"; }
		static get database () { return "music"; }
		static get table () { return "Track_Relationship"; }
	}

	return TrackRelationship;
})();
