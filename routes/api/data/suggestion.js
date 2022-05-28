module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Suggestion = require("../../../modules/data/suggestion.js");
	const Columns = require("../../../modules/internal/columns.js");

	const nonAdminStatuses = ["Dismissed by author"];
	const lockedStatuses = ["Completed", "Denied", "Dismissed", "Dimissed by author"];

	const fetchUserID = async (req) => {
		const { userID: rawUserID, userName } = req.query;
		let userID = null;
		if (rawUserID || userName) {
			const userData = await sb.User.get(Number(rawUserID) || userName);
			userID = userData?.ID;
		}

		return userID;
	};

	const prettifyData = (data) => data.map(i => {
		const text = (i.Text) ? sb.Utils.escapeHTML(i.Text) : "N/A";
		const trimmedText = sb.Utils.wrapString(text, 200);
		const update = (i.Last_Update) ? new sb.Date(i.Last_Update).valueOf() : null;

		return {
			Author: i.User_Name,
			Text: (i.Text.length > 200)
				? `<div title="${text}">${trimmedText}</div>`
				: text,
			Status: i.Status ?? "(pending)",
			Update: update,
			ID: `<a href="/data/suggestion/${i.ID}">${i.ID}</a>`
		};
	});

	/**
	 * @api {get} /data/suggestion/status/list Suggestion - Status - List
	 * @apiName ListSuggestionsStatuses
	 * @apiDescription Posts the list of possible suggestions' statuses,
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiSuccess {string[]} data
	 */
	Router.get("/status/list", async (req, res) => {
		const data = await Columns.getEnumColumnOptions("data", "Suggestion", "Status");
		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/suggestion/status/list Suggestion - Category - List
	 * @apiName ListSuggestionsCategories
	 * @apiDescription Posts the list of possible suggestions' categories,
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiSuccess {string[]} data
	 */
	Router.get("/category/list", async (req, res) => {
		const data = await Columns.getEnumColumnOptions("data", "Suggestion", "Category");
		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/suggestion/stats Suggestion - stats
	 * @apiName GetSuggestionStatistics
	 * @apiDescription Posts a summary of suggestions' statistics
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiParam {number} [limit] limits the response to given amount of rows
	 * @apiSuccess {Object[]} stat
	 * @apiSuccess {number} stat.userID
	 * @apiSuccess {string} stat.userName
	 * @apiSuccess {number} stat.total Amount of suggestions the user has made
	 * @apiSuccess {number} stat.accepted Suggestions in accepted states (aggregate across more statuses)
	 * @apiSuccess {number} stat.refused Suggestions in refused states (aggregate across more statuses)
	 **/
	Router.get("/stats", async (req, res) => {
		let limit;
		if (req.query.limit) {
			limit = Number(req.query.limit);
			if (!sb.Utils.isValidInteger(limit)) {
				return sb.WebUtils.apiFail(res, 400, "Invalid integer provided as limit");
			}
		}

		const data = await Suggestion.stats();
		if (limit) {
			return sb.WebUtils.apiSuccess(res, data.slice(0, limit));
		}
		else {
			return sb.WebUtils.apiSuccess(res, data);
		}
	});

	/**
	 * @api {get} /data/suggestion/stats Suggestion - user stats
	 * @apiName GetUSerSuggestionStatistics
	 * @apiDescription Posts a summary of a single users's suggestions statistics
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiSuccess {number} globalTotal Total amount of all suggestions
	 * @apiSuccess {number} userTotal Total amount of given user's suggestions
	 * @apiSuccess {Object[]} statuses Data for each status
	 * @apiSuccess {number} stat.globalAmount Total amount of suggestions with given status
	 * @apiSuccess {number} stat.userAmount Total amount of given user's suggestions with given status
	 **/
	Router.get("/stats/user/:user", async (req, res) => {
		const userData = await sb.User.get(req.params.user);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}

		const data = await Suggestion.userStats(userData.ID);
		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/suggestion/list Suggestion - List
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
	 * @apiSuccess {number} [priority]
	 * @apiSuccess {date} date ISO date string of the suggestion creation
	 * @apiSuccess {string} [notes]
	 **/
	Router.get("/list", async (req, res) => {
		const { category, status, userID: rawUserID, userName } = req.query;

		let userID = null;
		if (rawUserID || userName) {
			const userData = await sb.User.get(Number(rawUserID) || userName);
			userID = userData.ID;
		}

		const data = await Suggestion.list({ category, status, userID });
		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/suggestion/list Suggestion - active list
	 * @apiName ListResolvedSuggestions
	 * @apiDescription Posts a list of active or still pending suggestions
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiParam {number} [userID] Filter by user ID. Mutually exclusive with `userName`.
	 * @apiParam {string} [userName] Filter by user name. Mutually exclusive with `userID`.
	 * @apiSuccess {number} ID
	 * @apiSuccess {number} userID
	 * @apiSuccess {string} userName
	 * @apiSuccess {string} category
	 * @apiSuccess {string} status
	 * @apiSuccess {number} [priority]
	 * @apiSuccess {date} date ISO date string of the suggestion creation
	 * @apiSuccess {string} [notes]
	 **/
	Router.get("/list/active", async (req, res) => {
		const userID = await fetchUserID(req);
		const data = await Suggestion.list({
			userID,
			status: [null, "Approved", "Blocked"]
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/suggestion/list Suggestion - resolved list
	 * @apiName ListResolvedSuggestions
	 * @apiDescription Posts a list of already resolved suggestions
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiParam {number} [userID] Filter by user ID. Mutually exclusive with `userName`.
	 * @apiParam {string} [userName] Filter by user name. Mutually exclusive with `userID`.
	 * @apiSuccess {number} ID
	 * @apiSuccess {number} userID
	 * @apiSuccess {string} userName
	 * @apiSuccess {string} category
	 * @apiSuccess {string} status
	 * @apiSuccess {number} [priority]
	 * @apiSuccess {date} date ISO date string of the suggestion creation
	 * @apiSuccess {string} [notes]
	 **/
	Router.get("/list/resolved", async (req, res) => {
		const userID = await fetchUserID(req);
		const data = await Suggestion.list({
			userID,
			status: ["Completed", "Denied", "Dismissed", "Dimissed by author", "Moved to Github"]
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/list/client", async (req, res) => {
		const data = await Suggestion.list();
		const resultData = prettifyData(data);

		return sb.WebUtils.apiSuccess(res, resultData, { skipCaseConversion: true });
	});

	Router.get("/list/active/client", async (req, res) => {
		const userID = await fetchUserID(req);
		const data = await Suggestion.list({
			userID,
			status: [null, "Approved", "Blocked"]
		});

		const resultData = prettifyData(data);
		return sb.WebUtils.apiSuccess(res, resultData, { skipCaseConversion: true });
	});

	Router.get("/list/resolved/client", async (req, res) => {
		const userID = await fetchUserID(req);
		const data = await Suggestion.list({
			userID,
			status: ["Completed", "Denied", "Dismissed", "Dimissed by author", "Moved to Github"]
		});

		const resultData = prettifyData(data);
		return sb.WebUtils.apiSuccess(res, resultData, { skipCaseConversion: true });
	});

	/**
	 * @api {get} /data/suggestion/list Suggestion - Meta
	 * @apiName SuggestionsMeta
	 * @apiDescription Posts metadata about suggestions - internal use only
	 * @apiGroup Data
	 * @apiPermission none
	 **/
	Router.get("/meta", async (req, res) => {
		const columns = ["Author", "Text", "Status", "Priority", "Update", "ID"];
		const count = await Suggestion.count();
		return sb.WebUtils.apiSuccess(res, { columns, count });
	});

	/**
	 * @api {get} /data/suggestion/:id Suggestion - Detail
	 * @apiName GetSuggestionDetail
	 * @apiDescription Posts details for a provided suggestion ID
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} text
	 * @apiSuccess {date} date ISO date string of the suggestion creation
	 * @apiSuccess {string} category
	 * @apiSuccess {string} status
	 * @apiSuccess {number} [priority]
	 * @apiSuccess {string} [notes]
	 * @apiSuccess {date} lastUpdate
	 * @apiSuccess {string} [githubLink]
	 * @apiSuccess {string} username
	 * @apiSuccess {number} userID
	 */
	Router.get("/:id", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed suggestion ID");
		}

		const data = await Suggestion.selectSingleCustom(q => q
			.select("User_Alias.Name AS Username")
			.join("chat_data", "User_Alias")
			.where("Suggestion.ID = %n", ID)
		);

		if (!data) {
			return sb.WebUtils.apiFail(res, 404, "Suggestion does not exist");
		}
		else {
			data.User_ID = data.User_Alias;
			delete data.User_Alias;

			return sb.WebUtils.apiSuccess(res, data);
		}
	});

	/**
	 * @api {put} /data/suggestion/ Suggestion - Edit
	 * @apiName EditSuggestion
	 * @apiDescription Updates an already existing suggestion, based on ID.<br>
	 * Users with level >= admin can set anything without limitations on any suggestion<br>
	 * Other users with level >= login can set categories, or dismiss their suggestions
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
	 * Suggestion ID is malformed<br>
	 * Using both `addendum` and `text` at the same time<br>
	 * When not admin, attempting to edit someone else's suggestion<br>
	 * When not admin, attempting to edit suggestion with locked status<br>
	 * When not admin, attempting to set a disallowed status<br>
	 * @apiError (401) Unauthorized Authorization failed
	 * @apiError (403) AccessDenied Not logged in
	 **/
	Router.put("/", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const { ID: rawID, category, text, addendum, notes, status } = req.query;
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
			if (row.values.User_Alias !== auth.userID) {
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
