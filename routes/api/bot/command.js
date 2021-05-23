module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Command = require("../../../modules/chat-data/command");

	/**
	 * @api {get} /bot/command/list/ Command - list
	 * @apiName GetCommandList
	 * @apiDescription Posts a list of bot commands and their parameters
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiSuccess {Object[]} command List of commands
	 * @apiSuccess {number} command.ID
	 * @apiSuccess {string} command.name
	 * @apiSuccess {string[]} [command.aliases]
	 * @apiSuccess {string} [command.description]
	 * @apiSuccess {number} command.cooldown
	 * @apiSuccess {object} command.flags
	 * @apiSuccess {string} [command.whitelistResponse]
	 */
	Router.get("/list", async (req, res) => {
		const data = (await Command.selectMultipleCustom(rs => rs
			.where("Flags NOT %*like*", "archived")
			.where("Flags NOT %*like*", "system")
		)).map(i => ({
			ID: i.ID,
			Name: i.Name,
			Aliases: (i.Aliases) ? JSON.parse(i.Aliases) : [],
			Description: i.Description,
			Cooldown: i.Cooldown,
			Flags: i.Flags
		}));

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
