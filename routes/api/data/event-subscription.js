const Express = require("express");
const Router = Express.Router();

const User = require("../../../modules/chat-data/user-alias.js");
const EventSubscription = require("../../../modules/data/event-subscription.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	/**
	 * @api {get} /data/event-subscription/:userid/list Fetch user event subscriptions by user ID
	 * @apiName FetchUserEventSubscriptions
	 * @apiDescription Fetch user event subscriptions, by user ID
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiError (404) NotFound User was not found
	 **/
	Router.get("/:userid/list", async (req, res) => {
		const id = Number(req.params.userid);
		if (!sb.Utils.isValidInteger(id)) {
			return WebUtils.apiFail(res, 400, "Malformed numeric ID provided");
		}

		const userData = await User.selectSingleCustom(q => q.where("ID = %n", id));
		if (!userData) {
			return WebUtils.apiFail(res, 404, "User not found");
		}

		const subData = await EventSubscription.selectCustom(q => q
			.select("Type", "Event_Subscription.Data AS Data", "Flags", "Created", "Last_Edit")
			.select("Channel.Name AS ChannelName", "Channel.Description AS ChannelDescription", "Channel.Platform AS PlatformName")
			.join({
				toDatabase: "chat_data",
				toTable: "Channel",
				on: "Event_Subscription.Channel = Channel.ID"
			})
			.where("User_Alias = %n", userData.ID)
			.where("Active = %b", true)
		);

		const data = subData.map(i => ({
			type: i.Type,
			channel: i.ChannelDescription ?? i.ChannelName ?? null,
			platform: i.PlatformName ?? null,
			data: JSON.parse(i.Data ?? "{}"),
			flags: JSON.parse(i.Flags ?? "{}"),
			created: i.Created,
			edited: i.Last_Edit ?? null
		}));

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
