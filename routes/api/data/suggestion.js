module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Suggestion = require("../../../modules/data/suggestion.js");

	const nonAdminStatuses = ["Dismissed by author"];
	const lockedStatuses = ["Completed", "Denied", "Dismissed", "Dimissed by author"];

	/**
	 * @api {put} /data/suggestion/list Suggestion - List
	 * @apiName ListSuggestions
	 * @apiDescription Posts a list of suggestions
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiParam {number} [userID] Filter by user ID. Mutually exclusive with `userName`.
	 * @apiParam {string} [userName] Filter by user name. Mutually exclusive with `userID`.
	 * @apiParam {string} [category] Filter by category
	 * @apiParam {string} [status] Filter by status
	 * @apiSuccess {number} ID
	 * @apiSuccess {number} userID
	 * @apiSuccess {string} userName
	 * @apiSuccess {string} category
	 * @apiSuccess {string} status
	 * @apiSuccess {date} date ISO date string of the suggestion creation
	 * @apiSuccess {string} [notes]
	 **/
	Router.get("/list", async (req, res) => {
		const { category, status, userID: rawUserID, userName } = req.query;
		let userID = null;
		if (rawUserID) {
			userID = Number(rawUserID);
			if (!sb.Utils.isValidInteger(userID)) {
				return sb.WebUtils.apiFail(res, 400, "Malformed user ID");
			}
		}

		if (userID && userName) {
			return sb.WebUtils.apiFail(res, 400, "Cannot use both userID and userName in the same request");
		}

		const rawData = (await Suggestion.list()).filter(i => (
			(!category || category === i.Category)
			&& (!status || status === i.Status)
			&& (!userID || userID === i.User_Alias)
			&& (!userName || userName === i.User_Name)
		));

		const data = rawData.map(i => ({
			ID: i.ID,
			userID: i.User_Alias,
			userName: i.User_Name,
			category: i.Category,
			status: i.Status,
			text: i.Text,
			date: i.Date,
			notes: i.Notes
		}));

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {put} /data/suggestion/ Suggestion - Edit
	 * @apiName EditSuggestion
	 * @apiDescription Updates an already existing suggestion, based on ID.<br>
	 *     Users with level >= admin can set anything without limitations on any suggestion
	 *     Other users with level >= login can set categories, or dismiss their suggestions
	 * @apiGroup Data
	 * @apiPermission login
	 * @apiParam {number} ID ID of suggestion to edit
	 * @apiParam {string} [category]
	 * @apiParam {string} [addendum] Appends the suggestion's text with the provided one.
	 * @apiParam {string} [text] Replaces the suggestion's current text with the provided one
	 * @apiParam {string} [status]
	 * @apiParam {string} [notes] Only available for admins
	 * @apiSuccess {boolean} success True if everything was completed successfully
	 * @apiError (400) InvalidRequest Suggestion ID does not exist<br>
	 *     Suggestion ID is malformed<br>
     *     Using both `addendum` and `text` at the same time<br>
	 *     When not admin, attempting to edit someone else's suggestion<br>
	 *     When not admin, attempting to edit suggestion with locked status<br>
	 *     When not admin, attempting to set a disallowed status<br>
	 * @apiError (401) Unauthorized Authorization failed
	 * @apiError (403) AccessDenied Not logged in
	 **/
	Router.put("/", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, 401, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const {ID: rawID, category, text, addendum, notes, status} = req.query;
		const ID = Number(rawID);

		if (!sb.Utils.isValidInteger(ID)) {
			return sb.WebUtils.apiFail(res, 400, "Invalid ID provided");
		}

		const row = await Suggestion.getRow(ID);
		if (row === null) {
			return sb.WebUtils.apiFail(res, 400, "Suggestion ID does not exists");
		}
		else if (text && addendum) {
			return sb.WebUtils.apiFail(res, 400, "Cannot use both addendum and text parameters in the same request");
		}

		// If the user has admin level, let them do whatever.
		if (sb.WebUtils.compareLevels(auth.level, "admin")) {
			row.setValues({
				Category: category ?? row.values.Category,
				Notes: notes ?? row.values.Notes,
				Status: status ?? row.values.Status,
				Text: text ?? row.values.Text
			});
		}
		// Otherwise, restrictions apply.
		else {
			if (row.values.User_Alias !== auth.userID)  {
				return sb.WebUtils.apiFail(res, 400, "You cannot edit this suggestion - it does not belong to you");
			}
			else if (lockedStatuses.includes(row.values.Status)) {
				return sb.WebUtils.apiFail(res, 400, "You cannot edit this suggestion - its status has been locked");
			}
			else if (status && !nonAdminStatuses.includes(status)) {
				return sb.WebUtils.apiFail(res, 400, "Cannot set this status");
			}

			row.setValues({
				Category: category ?? row.values.Category,
				Status: status ?? row.values.Status,
				Text: text ?? row.values.Text
			});
		}

		if (addendum) {
			row.values.Text += `\nEdited ${new sb.Date().format("Y-m-d H:i:s")} - ${addendum}`;
		}

		try {
			await row.save();
		}
		catch (e) {
			console.error(e);
			return sb.WebUtils.apiFail(res, 400, "Error raised while saving suggestion - check your status/category");
		}

		return sb.WebUtils.apiSuccess(res, {
			success: true
		});
	});

	return Router;
})();