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
	 * @apiSuccess {string} timestamp ISO date string of the slots victory
	 * @apiSuccess {number} rank
	 **/
	Router.get("/list", async (req, res) => {
		const data = await SlotsWinner.selectCustom(rs => rs
			.select("Slots_Winner.ID AS ID", "User_Alias", "Channel", "Odds", "Timestamp")
			.select("DENSE_RANK() OVER (ORDER BY Odds DESC) AS Rank")
			.select("Channel.Name AS Channel_Name")
			.select("User_Alias.Name AS User_Name")
			.join("chat_data", "Channel")
			.join("chat_data", "User_Alias")
		);

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /data/slots-winner/list Slots Winner - Detail
	 * @apiName GetSlotsWinnerDetail
	 * @apiDescription Fetches the detail of a specific slot winner
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
	 * @apiSuccess {number} rank
	 **/
	Router.get("/detail/:id", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return sb.WebUtils.apiFail(res, 400, "Invalid ID provided");
		}

		const data = await SlotsWinner.selectSingleCustom(rs => rs
			.select("Channel.Name AS Channel_Name")
			.select("User_Alias.Name AS User_Name")
			.join("chat_data", "Channel")
			.join("chat_data", "User_Alias")
			.where("Slots_Winner.ID = %n", ID)
			.single()
		);

		if (!data) {
			return sb.WebUtils.apiFail(res, 404, "Provided ID does not exist");
		}

		data.Rank = await SlotsWinner.selectCustom(rs => rs
			.select("COUNT(*) AS Rank")
			.join("chat_data", "User_Alias")
			.where("Odds > %n", data.Odds)
			.groupBy("Odds")
			.single()
			.flat("Rank")
		);

		return sb.WebUtils.apiSuccess(res, data);
	})

	return Router;
})();
