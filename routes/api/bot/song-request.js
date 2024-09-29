const Express = require("express");
const Router = Express.Router();

const SongRequest = require("../../../modules/chat-data/song-request.js");
const VideoType = require("../../../modules/data/video-type.js");
const WebUtils = require("../../../utils/webutils.js");

const cacheKeys = {
	TTS_ENABLED: "text-to-speech-state",
	SONG_REQUESTS_STATE: "song-requests-state"
};

module.exports = (function () {
	"use strict";

	/**
	 * @api {get} /bot/song-request/state Song Request - State
	 * @apiName GetSongRequestState
	 * @apiDescription Fetches the stream's current song request state
	 * @apiGroup Stream
	 * @apiPermission none
	 * @apiSuccess {string} state One of "off", "vlc", "cytube", "dubtrack"
	 */
	Router.get("/state", async (req, res) => {
		const state = await sb.Cache.getByPrefix(cacheKeys.SONG_REQUESTS_STATE);
		return WebUtils.apiSuccess(res, { state });
	});

	/**
	 * @api {get} /bot/song-request/queue Song Request - Queue
	 * @apiName GetSongRequestQueue
	 * @apiDescription Fetches the stream's current request queue
	 * @apiGroup Stream
	 * @apiPermission any
	 * @apiSuccess {Object[]} data
	 * @apiSuccess {number} data.ID
	 * @apiSuccess {number} data.vlcID
	 * @apiSuccess {string} data.link
	 * @apiSuccess {number} data.videoType
	 * @apiSuccess {string} data.name
	 * @apiSuccess {number} data.length
	 * @apiSuccess {string} data.status
	 * @apiSuccess {number} data.userAlias
	 * @apiSuccess {string} data.added ISO Date
	 * @apiSuccess {string} [data.started] ISO Date
	 * @apiSuccess {string} [data.ended] ISO Date
	 * @apiSuccess {string} data.parsedLink
	 */
	Router.get("/queue", async (req, res) => {
		const prefixSymbol = process.env.VIDEO_TYPE_REPLACE_PREFIX;
		const [videoTypes, rawData] = await Promise.all([
			VideoType.getParsers(),
			SongRequest.getNormalizedQueue(q => q.where("Status IN %s+", ["Current", "Queued"]))
		]);

		const data = rawData.map(track => {
			const { Link_Prefix: prefix } = videoTypes.find(i => track.Video_Type === i.ID);
			track.Parsed_Link = prefix.replace(prefixSymbol.Value, track.Link);

			return track;
		});

		return WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/song-request/queue Song Request - Queue
	 * @apiName GetSongRequestQueue
	 * @apiDescription Fetches the stream's song request history for the past week.
	 * @apiGroup Stream
	 * @apiPermission any
	 * @apiSuccess {Object[]} data
	 * @apiSuccess {number} data.ID
	 * @apiSuccess {number} data.vlcID
	 * @apiSuccess {string} data.link
	 * @apiSuccess {number} data.videoType
	 * @apiSuccess {string} data.name
	 * @apiSuccess {number} data.length
	 * @apiSuccess {string} data.status
	 * @apiSuccess {number} data.userAlias
	 * @apiSuccess {string} data.added ISO Date
	 * @apiSuccess {string} [data.started] ISO Date
	 * @apiSuccess {string} [data.ended] ISO Date
	 * @apiSuccess {string} data.parsedLink
	 */
	Router.get("/history", async (req, res) => {
		const prefixSymbol = process.env.VIDEO_TYPE_REPLACE_PREFIX;
		const [videoTypes, rawData] = await Promise.all([
			VideoType.getParsers(),
			SongRequest.getNormalizedQueue(q => q
				.where("Status = %s", "Inactive")
				.where("Added >= (NOW() - INTERVAL 7 DAY)")
			)
		]);

		const data = rawData.map(track => {
			const { Link_Prefix: prefix } = videoTypes.find(i => track.Video_Type === i.ID);
			track.Parsed_Link = prefix.replace(prefixSymbol.Value, track.Link);

			return track;
		});

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
