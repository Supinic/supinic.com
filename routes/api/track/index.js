module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Author = require("../../../modules/track/author.js");
	const Config = require("../../../modules/data/config.js");
	const Tag = require("../../../modules/track/tag.js");
	const Track = require("../../../modules/track/track.js");
	const TrackAuthor = require("../../../modules/track/track-author.js");
	const VideoType = require("../../../modules/data/video-type.js");
	// const TrackTag = require("../../../modules/track/track-tag.js");
	// const UserAlias = require("../../../modules/chat-data/user-alias.js");

	const allowedConnectTables = ["Author", "Table"];
	const allowedAuthorTypes = [
		"Archiver",
		"Arrangment",
		"Audio",
		"Author",
		"Featured",
		"Lyrics",
		"Producer",
		"Reuploader",
		"Uploader",
		"Video",
		"Vocals"
	];

	const subroutes = [
		["alias", "alias.js"],
		["author", "author.js"],
		["detail", "detail.js"],
		["favourite", "favourite.js"],
		["gachi", "gachi.js"],
		["tag", "tag.js"],
		// ["todo", "todo.js"],
		// ["reupload", "reupload.js"],
	];

	const linkOrUnlink = async (type, req, res) => {
		if (!res || !res.locals) {
			return sb.WebUtils.apiFail(res, 401, "Session timed out");
		}
		else if (!res.locals.authUser) {
			return sb.WebUtils.apiFail(res, 401, "Not logged in");
		}

		const { trackID: rawTrackID, targetTable, targetID: rawTargetID, role } = req.query;
		if (!rawTrackID || !targetTable || !rawTargetID) {
			return sb.WebUtils.apiFail(res, 400, "Required parameters: trackID, targetTable, targetID");
		}
		else if (!allowedConnectTables.includes(targetTable)) {
			return sb.WebUtils.apiFail(res, 400, "targetTable must be one of: " + allowedConnectTables.join(", "));
		}
		else if (targetTable === "Author" && (!role || !allowedAuthorTypes.includes(role))) {
			return sb.WebUtils.apiFail(res, 400, "For Author, role must be provided and be one of: " + allowedAuthorTypes.join(", "));
		}

		const trackID = Number(rawTrackID);
		if (!sb.Utils.isValidInteger(trackID)) {
			return sb.WebUtils.apiFail(res, 400, "trackID is not a valid numeric ID");
		}

		const targetID = Number(rawTargetID);
		if (!sb.Utils.isValidInteger(targetID)) {
			return sb.WebUtils.apiFail(res, 400, "targetID is not a valid numeric ID");
		}

		if (!await Track.exists(trackID)) {
			return sb.WebUtils.apiFail(res, 400, "Track ID does not exist");
		}

		let targetExists = false;
		switch (targetTable) {
			case "Author": targetExists = await Author.exists(targetID); break;
			case "Tag": targetExists = await Tag.exists(targetID); break;
		}

		if (targetExists === false) {
			return sb.WebUtils.apiFail(res, 400, `Target ID (${targetTable}.${targetID}) does not exist`);
		}

		let result = {};
		if (targetTable === "Author") {
			result = await TrackAuthor[type]({
				trackID,
				role,
				authorID: targetID,
				user: res.locals.userData.ID
			});
		}
		else if (targetTable === "Tag") {
			result = await TrackAuthor[type]({
				trackID,
				tagID: targetID,
				user: res.locals.userData.ID
			});
		}

		if (result.success) {
			return sb.WebUtils.apiSuccess(res, {
				success: true,
				type: type
			});
		}
		else {
			return sb.WebUtils.apiFail(res, 400, result.toString());
		}
	};

	const formatListResponse = (data) => data.map(row => ({
		ID: row.ID,
		Link: row.Link,
		Parsed_Link: row.Parsed_Link,
		Video_Type: row.Video_Type,
		Track_Type: row.Track_Type,
		Duration: row.Duration,
		Available: row.Available,
		Published: row.Published,
		Legacy_ID: row.Legacy_ID,
		Tags: row.Tags,
		Authors: row.Authors,
		Favourites: row.Favourites
	}));

	Router.get("/", (req, res) => res.sendStatus(200));

	/**
	 * @api {post} /track Track - Post
	 * @apiName PostTrack
	 * @apiDescription Posts a new Track to the list - based on its link
	 * @apiGroup Track-List
	 * @apiPermission login/editor
	 * @apiSuccess {number} trackID New track's ID
	 * @apiSuccess {string} message Description of the method succeeding
	 * @apiError (400) InvalidRequest If the addition fails
	 * @apiError (401) Unauthorized If not logged in or invalid credentials provided
	 * @apiError (403) AccessDenied Insufficient user level
	 * @apiError (501) NotImplemented When trying to add a Track with no or link=null<br>
	 *  This will be available at a later date (when the method to add such a track is implemented)
	 */
	Router.post("/", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Insufficient user level: At least \"login\" required");
		}

		const {link, type = "Single"} = req.query;
		const result = await Track.add({
			link, addedBy: auth.userID, skipAuthorCheck: true
		});

		if (!result.success) {
			return sb.WebUtils.apiFail(res, 400, result.toString());
		}
		else {
			return sb.WebUtils.apiSuccess(res, {
				trackID: result.data.ID,
				message: result.toString()
			})
		}
	});

	/**
	 * @api {get} /track/list/ Track - List
	 * @apiName GetTrackList
	 * @apiDescription Fetches a full list of Tracks with no filtering
	 * @apiGroup Track-List
	 * @apiPermission any
	 * @apiSuccess {Object[]} track The list of Tracks
	 * @apiSuccess {number} track.ID
	 * @apiSuccess {string} [track.link] The unparsed link of a Track (just the site-specific ID)<br>
	 *     If null, the track is known to exist, but has no standalone upload
	 * @apiSuccess {string} [track.parsedLink] Full and direct link of the Track (with the site URL)<br>
	 *     If null, the above mentioned link is also null
	 * @apiSuccess {number} [track.videoType] Numeric ID specifying the hosting site (check @todo endpoint)<br>
	 *     If null, the above mentioned link is also null
	 * @apiSuccess {string} track.trackType Track type - Single/Collaboration/... etc
	 * @apiSuccess {number} [track.duration] Length of track in seconds<br>
	 *     If null, the track has been unavailable before the duration could be fetched, OR<br>
	 *     The above mentioned link is null
	 * @apiSuccess {boolean} track.available Determines if track is publicly available on the site
	 * @apiSuccess {string} [track.published] Track publish date, as ISO string<br>
	 *     If null, the track has been unavailable before the publish date could be fetched, OR<br>
	 *     The above mentioned link is null
	 * @apiSuccess {number} track.favourites Amount of favourites each track has. Defaults to zero.
	 * @apiSuccess {number} [track.legacyID] ID pointer to the legacy gachi list<br>If null, no such track exists in the deprecated list
	 * @apiSuccess {number[]} track.tags List of tag IDs associated with this Track.
	 */
	Router.get("/list", async (req, res) => {
		const rawData = await Track.list();
		const list = formatListResponse(rawData);
		return sb.WebUtils.apiSuccess(res, list);
	});

	/**
	 * @api {get} /track/lookup/ Track - Lookup
	 * @apiName LookupTrackList
	 * @apiDescription Fetches a modified list of Tracks
	 * @apiGroup Track-Lookup
	 * @apiPermission any
	 * @apiSuccess {Object[]} track The list of Tracks, exactly the same as in the GetTrackList endpoint
	 */
	Router.get("/lookup", async (req, res) => {
		const { ID } = req.query;
		if (!ID) {
			return sb.WebUtils.apiSuccess(res, []);
		}

		const numberIDs = (typeof ID === "string")
			? [ID].map(Number)
			: ID.map(Number);

		if (!numberIDs.some(sb.Utils.isValidInteger)) {
			return sb.WebUtils.apiFail(res, 400, "One or more invalid IDs requested");
		}

		const rawData = await Track.list(numberIDs);
		const list = formatListResponse(rawData);
		return sb.WebUtils.apiSuccess(res, list);
	});

	/**
	 * @api {get} /track/search Track - Search
	 * @apiName SearchTrackList
	 * @apiDescription Fetches a filtered list of Tracks based on query
	 * @apiGroup Track-List
	 * @apiParam {number} addedByID Internal ID of the user who added the Track to the list
	 * @apiParam {string} addedByName Name of user who added the Track to the list
	 * @apiParam {string} authorID Filter by the ID of author
	 * @apiParam {string} authorName Filter by author name
	 * @apiParam {number[]} includeTags Comma-delimited list of Tag IDs that all must be connected to tracks
	 * @apiParam {number[]} excludeTags Comma-delimited list of Tag IDs that all must NOT be connected to tracks
	 * @apiParam {number} checkUsernameFavourite If set, will check if given user or userID has results songs in their favourites.
	 * @apiParam {string} checkUserIDFavourite If set, will check if given user or userID has results songs in their favourites.
	 * @apiParam {boolean} hasLegacyID If true, filters tracks that are also present in the deprecated list
	 * @apiParam {boolean} includeYoutubeReuploads If true, each track will contain an array with its possible youtube reuploads
	 * @apiParam {string} name Filter by name
	 * @apiPermission any
	 * @apiSuccess {Object[]} track The list of Tracks
	 * @apiSuccess {number} track.ID
	 * @apiSuccess {string} [track.link] The unparsed link of a Track (just the site-specific ID)<br>
	 *     If null, the track is known to exist, but has no standalone upload
	 * @apiSuccess {string} [track.parsedLink] Full and direct link of the Track (with the site URL)<br>
	 *     If null, the above mentioned link is also null
	 * @apiSuccess {number} [track.videoType] Numeric ID specifying the hosting site (check @todo endpoint)<br>
	 *     If null, the above mentioned link is also null
	 * @apiSuccess {string} track.trackType Track type - Single/Collaboration/... etc
	 * @apiSuccess {number} [track.duration] Length of track in seconds<br>
	 *     If null, the track has been unavailable before the duration could be fetched, OR<br>
	 *     The above mentioned link is null
	 * @apiSuccess {boolean} track.available Determines if track is publicly available on the site
	 * @apiSuccess {string} [track.published] Track publish date, as ISO string<br>
	 *     If null, the track has been unavailable before the publish date could be fetched, OR<br>
	 *     The above mentioned link is null
	 * @apiSuccess {number} [track.legacyID] ID pointer to the legacy gachi list<br>If null, no such track exists in the deprecated list
	 * @apiSuccess {number[]} track.tags List of tag IDs associated with this Track.
	 */
	Router.get("/search", async (req, res) => {
		const {
			addedByID,
			addedByName,
			authorID,
			authorName,
			checkUserIDFavourite,
			checkUsernameFavourite,
			includeTags,
			excludeTags,
			hasLegacyID,
			name,
			includeYoutubeReuploads
		} = req.query;

		const data = await Track.search({
			addedByID,
			addedByName,
			name,
			hasLegacyID,
			checkUserIDFavourite,
			checkUsernameFavourite,
			includeYoutubeReuploads,
			authorID: Number(authorID),
			authorName: authorName,
			includeTags: (includeTags) ? includeTags.split(",").map(Number) : null,
			excludeTags: (excludeTags) ? excludeTags.split(",").map(Number) : null,
		});

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /track/resolve/:id Quick track ID resolver
	 * @apiName ResolveTrackID
	 * @apiDescription Quickly resolves a track ID into a link + video type
	 * @apiGroup Track-List
	 * @apiParam {number} id Track ID
	 * @apiPermission any
	 * @apiSuccess {number} ID Reflection of the track ID back
	 * @apiSuccess {string} link Fully parsed link with the media site as well
	 * @apiSuccess {string} videoType Media site description
	 * @apiSuccess {object} raw Unparsed values
	 * @apiSuccess {string} raw.link Unparsed link, just the video ID
	 * @apiSuccess {number} raw.videoType Unparsed video type ID
	 */
	Router.get("/resolve/:id", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed track ID");
		}

		const row = await Track.getRow(ID);
		if (!row) {
			return sb.WebUtils.apiFail(res, 404, "Track ID does not exist");
		}

		await sb.WebUtils.loadVideoTypes();
		const link = sb.WebUtils.parseVideoLink(row.values.Video_Type, row.values.Link);
		const videoType = sb.WebUtils.videoTypes[row.values.Video_Type].Parser_Name;

		return sb.WebUtils.apiSuccess(res, {
			ID,
			link,
			Video_Type: videoType,
			raw: {
				link: row.values.Link,
				Video_Type: row.values.Video_Type,
			}
		});
	});

	/**
	 * @api {get} /track/present Track - Check present
	 * @apiName GetTrackPresent
	 * @apiDescription Checks if a Track is present in the list
	 * @apiGroup Track-List
	 * @apiParam {string} url Full URL of the potential Track being checked
	 * @apiPermission any
	 * @apiSuccess {boolean} present Determines the presence of given URL in the list
	 * @apiSuccess {number} [link] ID of the track in the list, if it exists. If it doesn't, then null.
	 * @apiSuccess {string} link The parsed-out part of the link, as it will appear in the database (without the site prefix)
	 * @apiSuccess {string} parsedLink Full link
	 */
	Router.get("/present", async (req, res) => {
		const link = req.query.url;
		if (!link) {
			return sb.WebUtils.apiFail(res, 400, "No URL provided");
		}

		let parsedLink = null;
		try {
			parsedLink = sb.Utils.linkParser.parseLink(link);
		}
		catch (e) {
			return sb.WebUtils.apiFail(res, 400, "Cannot parse given link");
		}

		const presentTrack = await Track.present(parsedLink);
		return sb.WebUtils.apiSuccess(res, {
			present: Boolean(presentTrack),
			ID: (presentTrack) ? presentTrack.ID : null,
			link: link,
			parsedLink: parsedLink,
		});
	});

	/**
	 * @api {post} /track/connect/ Track - Connect
	 * @apiName PostTrackConnect
	 * @apiDescription Creates a connection between existing Track and another table (Author/Tag)
	 * @apiGroup Track-List
	 * @apiParam {number} trackID ID of the existing Track
	 * @apiParam {string} targetTable Name of the table to connect
	 * @apiParam {number} targetID Target table ID to connect
	 * @apiPermission any
	 * @apiSuccess {boolean} success If succeeded, always true
	 * @apiSuccess {string} type If succeeded always "link"
	 * @apiError (400) InvalidRequest trackID not provided<br>
	 *     No targetTable provided<br>
	 *     No targetID provided<br>
	 *     Invalid targetTable provided (must be one of Author/Tag)<br>
	 *     No role provided, when targetTable = Author<br>
	 *     Provided trackID is not a valid ID integer<br>
	 *     Provided trackID does not exist<br>
	 *     Provided targetTable.targetID does not exist<br>
	 *     <other> - Creation of the connection failed otherwise<br>
	 * @apiError (401) Unauthorized Session timed out<br>
	 *     Not logged in
	 */
	Router.post("/connect", async (req, res) => {
		return await linkOrUnlink("link", req, res);
	});

	/**
	 * @api {delete} /track/connect/ Track - Disconnect
	 * @apiName DeleteTrackConnect
	 * @apiDescription Removes an existing connection between existing Track and another table (Author/Tag)
	 * @apiGroup Track-List
	 * @apiParam {number} trackID ID of the existing Track
	 * @apiParam {string} targetTable Name of the table to connect
	 * @apiParam {number} targetID Target table ID to connect
	 * @apiPermission any
	 * @apiSuccess {boolean} success If succeeded, always true
	 * @apiSuccess {string} type If succeeded always "unlink"
	 * @apiError (400) InvalidRequest trackID not provided<br>
	 *     No targetTable provided<br>
	 *     No targetID provided<br>
	 *     Invalid targetTable provided (must be one of Author/Tag)<br>
	 *     No role provided, when targetTable = Author<br>
	 *     Provided trackID is not a valid ID integer<br>
	 *     Provided trackID does not exist<br>
	 *     Provided targetTable.targetID does not exist<br>
	 *     <other> - Creation of the connection failed otherwise<br>
	 * @apiError (401) Unauthorized Session timed out<br>
	 *     Not logged in
	 * @apiError (403) Forbidden Insufficient level (at least moderator required)
	 */
	Router.delete("/connect", async (req, res) => {
		if (res && res.locals && !res.locals.level.isModerator()) {
			sb.WebUtils.apiFail(res, 403, "Insufficient level (requires moderator)");
		}

		return await linkOrUnlink("unlink", req, res);
	});

	/**
	 * @api {post} /track/reupload/ Track - Reupload
	 * @apiName PostTrackReupload
	 * @apiDescription Creates a new Reupload connection between two existing Tracks, or an existing Track and a provided link, which is automatically turned into a new Track
	 * @apiGroup Track-List
	 * @apiParam {number} trackID ID of the existing Track
	 * @apiParam {string} targetTable Name of the table to connect
	 * @apiParam {number} targetID Target table ID to connect
	 * @apiPermission any
	 * @apiSuccess {boolean} success If succeeded, always true
	 * @apiSuccess {string} type If succeeded always "unlink"
	 * @apiError (400) InvalidRequest existingID not provided<br>
	 *     Neither reuploadID nor reuploadLink provided<br>
	 *     Both reuploadID and reuploadLink provided at the same time<br>
	 *     reuploadID provided, but it does not exist<br>
	 *     <other> - Creation of the connection failed otherwise<br>
	 * @apiError (401) (TODO: not working yet) Not logged in
	 */
	Router.post("/reupload", async (req, res) => {


		let {reuploadID, reuploadLink, existingID} = req.query;
		existingID = Number(existingID);
		reuploadID = Number(reuploadID);

		if (reuploadLink && reuploadID && sb.Utils.isValidInteger(reuploadID)) {
			return sb.WebUtils.apiFail(res, 400, "Cannot specify both reuploadLink and reuploadID");
		}
		else if (!reuploadLink && !sb.Utils.isValidInteger(reuploadID)) {
			return sb.WebUtils.apiFail(res, 400, "Must specify exactly one of reuploadLink or reuploadID");
		}
		else if (!sb.Utils.isValidInteger(existingID)) {
			return sb.WebUtils.apiFail(res, 400, "Must specify existingID");
		}

		if (reuploadID) {
			if (!await Track.exists(reuploadID)) {
				return sb.WebUtils.apiFail(res, 400, "Provided reuploadID does not exist");
			}

			const track = await Track.selectSingleCustom(q => q
				.select("Video_Type.Link_Prefix AS Prefix")
				.join("data", "Video_Type")
				.where("ID = %n", reuploadID)
			);

			reuploadLink = track.Prefix.replace(sb.Confif.get("VIDEO_TYPE_REPLACE_PREFIX"), track.Link);
			reuploadID = null;
		}

		// @todo create a verification step here - make a WebUtils method for this
		const user = (res.locals.authUser && res.locals.authUser.userData)
			? res.locals.authUser.userData
			: 1;

		const result = await Track.addReupload(existingID, reuploadLink, user.ID);
		if (!result.success) {
			return sb.WebUtils.apiFail(res, 400, result.toString());
		}
		else {
			return sb.WebUtils.apiSuccess(res, {
				success: true,
				message: result.toString()
			});
		}
	});

	/**
	 * @api {post} /track/todo/ Track - Add a todo track
	 * @apiName PostTrackTodo
	 * @apiDescription Adds a new track to the list - based on a URL - and tags it as Todo.
	 * @apiGroup Track-List
	 * @apiParam {string} url New track URL
	 * @apiPermission login
	 * @apiSuccess {boolean} success If succeeded, always true
	 * @apiSuccess {string} type If succeeded always "unlink"
	 * @apiError (400) InvalidRequest No url provided<br>
	 *     Provided url could not be parsed<br>
	 *     Both reuploadID and reuploadLink provided at the same time<br>
	 *     reuploadID provided, but it does not exist<br>
	 *     <other> - Creation of the connection failed otherwise<br>
	 * @apiError (401) Unauthorized If an error is encountered during authentication
	 * @apiError (403) Forbidden If provided user level is not sufficient (at least "login")
	 */
	Router.post("/todo", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Insufficient user level: At least \"login\" required");
		}

		const {url} = req.query;
		if (!url) {
			return sb.WebUtils.apiFail(res, 400, "No url provided");
		}
		else if (!sb.Utils.linkParser.autoRecognize(url)) {
			return sb.WebUtils.apiFail(res, 400, "Provided url could not be parsed");
		}

		const todoTag = await Tag.selectSingleCustom(q => q.where("Name = %s", "Todo"));
		const result = await Track.add(url, todoTag.ID, res.locals.authUser.userData.ID);

		if (result.success === true) {
			return sb.WebUtils.apiSuccess(res, { success: true });
		}
		else {
			return sb.WebUtils.apiFail(res, 400, result.toString());
		}
	});

	subroutes.forEach(([name, link]) =>  Router.use("/" + name, require("./" + link)));

	return Router;
})();