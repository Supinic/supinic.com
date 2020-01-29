module.exports = (function () {
	"use strict";

	const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	let Track = null;
	let Author = null;

	class TrackAuthor extends TemplateModule {
		static async get (authorID, trackID) {
			if (!sb.Utils.isValidInteger(authorID) || !sb.Utils.isValidInteger(trackID)) {
				return new Result(false, "Invalid ID format");
			}

			return await super.selectSingleCustom(q => q
				.where("Track = %n", trackID)
				.where("Author = %n", authorID)
			);
		}

		static async getByAuthor (authorID) {
			if (!sb.Utils.isValidInteger(authorID)) {
				return new Result(false, "Invalid ID format");
			}

			return await super.selectMultipleCustom(q => q
				.where("Author = %n", authorID)
			);
		}

		static async getByTrack (trackID) {
			if (!sb.Utils.isValidInteger(trackID)) {
				return new Result(false, "Invalid ID format");
			}

			return await super.selectMultipleCustom(q => q
				.where("Track = %n", trackID)
			);
		}

		static async link (options = {}) {
			Track = Track || require("./track.js");
			Author = Author || require("./author");

			const {trackID, authorID, notes = null, user = 1, role} = options;

			if (!sb.Utils.isValidInteger(trackID) || !sb.Utils.isValidInteger(authorID)) {
				return new Result(false, "Track-Author link: Invalid Track/Author ID format");
			}
			else if (!role) {
				return new Result(false, "Track-Author link: No role provided");
			}
			else if (!await Track.exists(trackID)) {
				return new Result(false, "Track-Author link: Track ID does not exist");
			}
			else if (!await Author.exists(authorID)) {
				return new Result(false, "Track-Author link: Author ID does not exist");
			}
			else if (await TrackAuthor.existsCustom(q => q.where("Track = %n AND Author = %n", trackID, authorID))) {
				return new Result(false, "Track-Author link: Link already exists");
			}

			await super.insert({
				Track: trackID,
				Author: authorID,
				Role: role,
				Notes: notes,
				Added_By: user
			});

			return new Result(true, `Track ID ${trackID} and Author ID ${authorID} linked successfully`);
		}

		static async unlink (options = {}) {
			const {trackID, authorID, role} = options;

			if (!sb.Utils.isValidInteger(trackID) || !sb.Utils.isValidInteger(authorID)) {
				return new Result(false, "Track-Author link: Invalid Track/Author ID format");
			}
			else if (!role) {
				return new Result(false, "Track-Author link: No role provided");
			}
			else if (!await Track.exists(trackID)) {
				return new Result(false, "Track-Author link: Track ID does not exist");
			}
			else if (!await Author.exists(authorID)) {
				return new Result(false, "Track-Author link: Author ID does not exist");
			}
			else if (!await TrackAuthor.existsCustom(q => q.where("Track = %n AND Author = %n"), trackID, authorID)) {
				return new Result(false, "Track-Author link: No link exists");
			}

			await super.deleteCustom(q => q
				.where("Track = %n", trackID)
				.where("Author = %n", authorID)
				.where("Role = %s", role)
			);

			return new Result(true, `Track ID ${trackID} and Author ID ${authorID} unlinked successfully`);
		}

		static get name () { return "track-author"; }
		static get database () { return "music"; }
		static get table () { return "Track_Author"; }
	}

	return TrackAuthor;
})();