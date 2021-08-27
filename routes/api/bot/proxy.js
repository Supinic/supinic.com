module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../../modules/chat-data/channel.js");

	const partOrJoin = async (type, req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		let query;
		if (req.body.channelName) {
			query = (q) => q.where("Name = %s", req.body.channelName);
		}
		else if (req.body.channelID) {
			query = (q) => q.where("Specific_ID = %s", req.body.channelID);
		}
		else {
			return sb.WebUtils.apiFail(res, 400, "Endpoint requires channelName or channelID");
		}

		const channel = await Channel.selectSingleCustom(q => {
			q.where("Platform = %n", 1);
			query(q);
			return q;
		});
		if (!channel) {
			return sb.WebUtils.apiFail(res, 404, "Channel does not exist");
		}

		const { banWavePartPermissions } = auth.userData.Data;
		if (!banWavePartPermissions) {
			return sb.WebUtils.apiFail(res, 401, "Endpoint requires banwave-part permissions");
		}
		else if (!banWavePartPermissions.includes(channel.ID)) {
			return sb.WebUtils.apiFail(res, 401, "You don't have banwave-part permission for this channel");
		}

		let response;
		try {
			response = await sb.Got("Supibot", {
				url: `channel/${type}`,
				searchParams: {
					channel: channel.Name
				}
			});
		}
		catch (e) {
			return sb.WebUtils.apiFail(res, 504, "Could not reach internal Supibot API", {
				code: e.code,
				errorMessage: e.message
			});
		}

		if (response.statusCode !== 200) {
			return sb.WebUtils.apiFail(res, response.statusCode, response.body.error.message);
		}
		else {
			return sb.WebUtils.apiSuccess(res, { message: "OK" });
		}
	};

	/**
	 * @api {post} /bot/proxy/banwave/part Part channel - banwave
	 * @apiName ProxyBanwavePartChannel
	 * @apiGroup ProxyBot
	 * @apiDescription Parts provided channel due to a banwave commencing.
	 * @apiPermission login + banwave permission
	 * @apiParam (body) {string} [channelID] Twitch channel - ID
	 * @apiParam (body) {string} [channelName] Twitch channel Name
	 **/
	Router.post("/banwave/part", async (req, res) => await partOrJoin("part", req, res));

	/**
	 * @api {post} /bot/proxy/banwave/join Join channel - banwave
	 * @apiName ProxyBanwaveJoinChannel
	 * @apiGroup ProxyBot
	 * @apiDescription (Re)joins provided channel due to a banwave finishing.
	 * @apiPermission login + banwave permission
	 * @apiParam (body) {string} [channelID] Twitch channel - ID
	 * @apiParam (body) {string} [channelName] Twitch channel Name
	 **/
	Router.post("/banwave/join", async (req, res) => await partOrJoin("join", req, res));

	return Router;
})();
