module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Track = require("../../../modules/track/track.js");
	const UserFavourite = require("../../../modules/track/user-favourite.js");

	Router.get("/user/:userID/track/:trackID", async (req, res) => {
		const { userID: rawUserID, trackID: rawTrackID } = req.params;
		const userID = Number(rawUserID);
		const trackID = Number(rawTrackID);
		if (!userID || !trackID) {
			return sb.WebUtils.apiFail(res, 400, "Track or user ID not provided properly");
		}

		const data = await UserFavourite.get({ trackID, userID });
		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.put("/track/:id", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const { id } = req.params;
		const trackID = Number(id);
		if (!trackID) {
			return sb.WebUtils.apiFail(res, 400, "Track ID not provided properly");
		}

		const exists = await UserFavourite.get({ trackID, userID: auth.userID });
		if (exists) {
			await UserFavourite.toggle({ trackID, userID: auth.userID });
		}
		else {
			await UserFavourite.add({ trackID, userID: auth.userID });
		}

		const [currentStatus, currentActiveList] = await Promise.all([
			UserFavourite.get({ trackID, userID: auth.userID }),
			UserFavourite.getActiveForTrack(trackID)
		]);

		return sb.WebUtils.apiSuccess(res, {
			success: true,
			active: currentStatus.Active,
			amount: currentActiveList.length
		});
	});

	Router.get("/user/:id", async (req, res) => {
		const { id } = req.params;
		const userData = await sb.User.get(Number(id));
		if (!userData) {
			return sb.WebUtils.apiFail(res, 400, "Provided user ID does not exist");
		}

		const data = await UserFavourite.getForUser(userData.ID);
		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/track/:id", async (req, res) => {
		const trackID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(trackID) || !await Track.exists(trackID)) {
			return sb.WebUtils.apiFail(res, 400, "Provided track ID does not exist");
		}

		const data = await UserFavourite.getForTrack(trackID);
		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/list", async (req, res) => {
		const data = await UserFavourite.selectMultipleCustom(q => q
			.select("User_Alias.Name AS User_Name")
			.select("Track.Name AS Track_Name")
			.join({
				toDatabase: "chat_data",
				toTable: "User_Alias",
				on: "User_Alias.ID = User_Favourite.User_Alias"
			})
			.join({
				toTable: "Track",
				on: "Track.ID = User_Favourite.Track"
			})
		);
		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
