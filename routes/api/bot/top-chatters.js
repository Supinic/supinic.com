module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../../modules/chat-data/channel.js");
	// const UserAliasMeta = require("../../../modules/chat-data/message-meta-user-alias.js");

	Router.get("/list/channel/:id", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return sb.WebUtils.apiFail(res, 400, "Invalid channel ID");
		}
		else if (!await Channel.exists(channelID)) {
			return sb.WebUtils.apiFail(res, 404, "Channel does not exist");
		}

		return sb.WebUtils.apiFail(res, 501, "Not fully implemented yet");
		// const data = await UserAliasMeta.selectCustom(q => q
		// 	.select("SUM(Message_Count) AS Total")
		// 	.select("User_Alias.Name AS Name")
		// 	.join("chat_data", "User_Alias")
		// 	.where("Channel = %n", channelID)
		// 	.groupBy("User_Alias")
		// 	.orderBy("SUM(Message_Count) DESC")
		// 	.limit(10)
		// );
		//
		// return sb.WebUtils.apiSuccess(res, {
		// 	channel: channelID,
		// 	top: data
		// });
	});

	return Router;
})();
