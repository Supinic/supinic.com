module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const SlotsWinner = require("../../../modules/data/slots-winner.js");

	/**
	 * @api {get} /data/slots-winner/list Slots Winner - List
	 * @apiName ListSlotsWinners
	 * @apiDescription Fetches a list of all slots winners
	 * @apiGroup Data
	 * @apiPermission none
	 * @apiSuccess {number} ID
	 * @apiSuccess {number} userAlias
	 * @apiSuccess {string} userName
	 * @apiSuccess {number} channel Channel ID, where the slots happened
	 * @apiSuccess {number} channelName Channel name, where the slots happened
	 * @apiSuccess {number} odds Odds in format 1:X
	 * @apiSuccess {string} source Whatever words, numbers the user rolled with
	 * @apiSuccess {string} result Whatever the slots resulted in
	 * @apiSuccess {string} timestamp ISO date string of the slots victory
	 **/
	Router.get("/list", async (req, res) => {
		const data = await SlotsWinner.selectMultipleCustom(rs => rs
			.select("Channel.Name AS Channel_Name")
			.select("User_Alias.Name AS User_Name")
			.join("chat_data", "Channel")
			.join("chat_data", "User_Alias")
		);

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();