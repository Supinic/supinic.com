module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const VideoRequest = require("../../../modules/cytube/video-request.js");

	/**
	 * @api {get} /cytube/video-request/history Cytube video request history
	 * @apiName CytubeVideoRequestHistory
	 * @apiDescription Gets video request history for Cytube, going back up to 7 days
	 * @apiGroup Cytube
	 * @apiPermission none
	 * @apiSuccess {Object[]} request
	 * @apiSuccess {number} request.ID Unique identifier
	 * @apiSuccess {number} request.videoType Internal ideo type ID
	 * @apiSuccess {string} request.userName Username of the person who requested the video
	 * @apiSuccess {string} request.link Internal short video link
	 * @apiSuccess {string} request.fullLink Fully parsed video link
	 * @apiSuccess {string} request.posted Datetime of requesting (not playing) the video as ISO date
	 * @apiSuccess {number} request.length Video length in seconds
	 **/
	Router.get("/video-request/history", async (req, res) => {
		await sb.WebUtils.loadVideoTypes();
		const rawData = VideoRequest.selectMultipleCustom(q => q
			.select("User_Alias.Name AS Username")
			.join({
				toDatabase: "chat_data",
				toTable: "User_Alias",
				on: "Video_Request.User_Alias = User_Alias.ID"
			})
			.where("Posted >= DATE_ADD(NOW(), INTERVAL -7 DAY")
		);

		const data = rawData.map(i => ({
			ID: i.ID,
			User_Name: i.Username,
			Link: i.Link,
			Video_Type: i.Video_Type,
			Full_Link: sb.WebUtils.parseVideoLink(i.Video_Type, i.Link),
			Posted: i.Posted,
			Length: i.Length
		}));

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();