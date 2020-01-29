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
	 * @apiSuccess {boolean} command.rollbackable
	 * @apiSuccess {boolean} command.skipBanphrases
	 * @apiSuccess {boolean} command.readOnly
	 * @apiSuccess {boolean} command.optOutable
	 * @apiSuccess {boolean} command.blockable
	 * @apiSuccess {boolean} command.ping
	 * @apiSuccess {boolean} command.pipeable
	 * @apiSuccess {boolean} command.whitelisted
	 * @apiSuccess {string} [command.whitelistResponse]
	 */
	Router.get("/list", async (req, res) => {
		const data = (await Command.selectMultipleCustom(rs => rs
			.where("Archived = %b", false)
			.where("System = %b", false)
		)).map(i => ({
			ID: i.ID,
			Name: i.Name,
			Aliases: (i.Aliases) ? JSON.parse(i.Aliases) : null,
			Description: i.Description,
			Cooldown: i.Cooldown,
			Rollbackable: i.Rollbackable,
			Skip_Banphrases: i.Skip_Banphrases,
			Read_Only: i.Read_Only,
			Opt_Outable: i.Opt_Outable,
			Blockable: i.Blockable,
			Ping: i.Ping,
			Pipeable: i.Pipeable,
			Whitelisted: i.Whitelisted,
			Whitelist_Response: i.Whitelist_Response,
		}));

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();