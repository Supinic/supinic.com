const Express = require("express");
const Router = Express.Router();

const MediaRequest = require("../../../modules/stream/media-request.js");
const User = require("../../../modules/chat-data/user-alias.js");
const WebUtils = require("../../../utils/webutils.js");

const cacheKeys = {
	TTS_ENABLED: "text-to-speech-state",
	SONG_REQUESTS_STATE: "song-requests-state",
	MPV_ITEM_DATA: "mpv-item-data"
};

module.exports = (function () {
	"use strict";

	/**
	 * @api {get} /bot/song-request/state Song Request - State
	 * @apiName GetSongRequestState
	 * @apiDescription Fetches the stream's current song request state
	 * @apiGroup Stream
	 * @apiPermission none
	 * @apiSuccess {string} state One of "off", "mpv"
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
	 * @apiSuccess {number} data.order
	 * @apiSuccess {string} data.url
	 * @apiSuccess {string|null} data.name
	 * @apiSuccess {number|null} data.length
	 * @apiSuccess {string|null} data.username
	 */
	Router.get("/queue", async (req, res) => {
		const entries = await sb.Cache.getByPrefix(cacheKeys.MPV_ITEM_DATA) ?? [];
		const users = new Map();

		const result = [];
		for (const entry of entries) {
			const item = entry[1];
			const obj = {
				order: item.id,
				url: item.url,
				name: item.name,
				length: item.duration
			};

			if (item.user !== null) {
				let username = users.get(item.user);
				if (!username) {
					const name = await User.getById(item.user);
					if (name) {
						users.set(item.user, name);
						username = name;
					}
				}

				obj.username = username;
			}

			result.push(obj);
		}

		return WebUtils.apiSuccess(res, result);
	});

	/**
	 * @api {get} /bot/song-request/queue Song Request - Queue
	 * @apiName GetSongRequestQueue
	 * @apiDescription Fetches the stream's song request history for the past week.
	 * @apiGroup Stream
	 * @apiPermission any
	 * @apiSuccess {Object[]} data
	 * @apiSuccess {number} data.ID
	 * @apiSuccess {number} data.order
	 * @apiSuccess {string} data.url
	 * @apiSuccess {string|null} data.name
	 * @apiSuccess {number|null} data.length
	 * @apiSuccess {string|null} data.username
	 * @apiSuccess {number} data.added
	 */
	Router.get("/history", async (req, res) => {
		const threshold = new sb.Date().addDays(-7);
		const rawData = await MediaRequest.getHistoryQueue(threshold);

		const data = rawData.map(i => ({
			ID: i.MID,
			order: i.PID,
			url: i.URL,
			name: i.Name,
			length: i.Duration,
			username: i.Username,
			added: i.Added
		}));

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
