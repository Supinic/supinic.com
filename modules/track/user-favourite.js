module.exports = (function () {
	"use strict";

	// const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	class UserFavourite extends TemplateModule {
		static async get (data) {
			if (!data.userID || !data.trackID) {
				throw new sb.Error({
					message: "Missing track or user ID"
				});
			}

			const favouriteData = await super.selectSingleCustom(q => q
				.where("User_Alias = %n", data.userID)
				.where("Track = %n", data.trackID)
			);

			return (favouriteData ?? null);
		}

		static async add (data) {
			const exists = Boolean(await this.get(data));
			if (exists) {
				throw new sb.Error({
					message: "Favourite row already exists"
				});
			}

			await super.insert({
				User_Alias: data.userID,
				Track: data.trackID
			});
		}

		static async toggle (data) {
			const exists = await this.get(data);
			if (!exists) {
				throw new sb.Error({
					message: "Favourite row does not yet exist"
				});
			}

			await sb.Query.getRecordUpdater(ru => ru
				.update(this.database, this.table)
				.set("Active", {
					useField: true,
					value: "NOT(Active)"
				})
				.where("Track = %n", data.trackID)
				.where("User_Alias = %n", data.userID)
			);
		}

		static async getForUser (userID) {
			return await super.selectMultipleCustom(q => q
				.where("User_Alias = %n", userID)
			);
		}

		static async getForTrack (trackID) {
			return await super.selectMultipleCustom(q => q
				.where("Track = %n", trackID)
			);
		}

		static get name () { return "user-favourite"; }
		static get database () { return "music"; }
		static get table () { return "User_Favourite"; }
	}

	return UserFavourite;
})();
