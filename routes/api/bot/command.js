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
	 * @apiSuccess {Array} command List of commands
	 * @apiSuccess {string} command.name
	 * @apiSuccess {string[]} [command.aliases]
	 * @apiSuccess {string} [command.description]
	 * @apiSuccess {number} command.cooldown
	 * @apiSuccess {object} command.flags
	 */
	Router.get("/list", async (req, res) => {
		const rawData = await Command.selectMultipleCustom(rs => rs
			.where("Flags NOT %*like*", "archived")
			.where("Flags NOT %*like*", "system")
		);

		const data = rawData.map(i => ({
			Name: i.Name,
			Aliases: (i.Aliases) ? JSON.parse(i.Aliases) : [],
			Description: i.Description,
			Cooldown: i.Cooldown,
			Flags: i.Flags ?? []
		}));

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/detail/command/:identifier Command - get data
	 * @apiName GetCommandData
	 * @apiDescription Fetches full data for a specific command. <br>
	 * The `identifier` parameter can be either number (ID) or string (Name, not aliases)
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiSuccess {string} command.name
	 * @apiSuccess {string[]} [command.aliases]
	 * @apiSuccess {string[]} [command.flags]
	 * @apiSuccess {string} [command.description]
	 * @apiSuccess {number} command.cooldown
	 * @apiSuccess {string} command.author
	 * @apiSuccess {date} command.lastEdit
	 * @apiSuccess {string} command.code
	 * @apiSuccess {Object[]} [command.params]
	 * @apiSuccess {string} command.params.name]
	 * @apiSuccess {string} command.params.type
	 * @apiSuccess {string} [command.staticData]
	 * @apiSuccess {string} [command.dynamicDescription]
	 */
	Router.get("/detail/:identifier", async (req, res) => {
		const command = await Command.selectSingleCustom(q => q.where("Name = %s", req.params.identifier));
		if (!command) {
			return sb.WebUtils.apiFail(res, 404, "Command does not exist");
		}

		return sb.WebUtils.apiSuccess(res, {
			Name: command.Name,
			Aliases: (command.Aliases) ? JSON.parse(command.Aliases) : [],
			Flags: command.Flags,
			Description: command.Description,
			Cooldown: command.Cooldown,
			Author: command.Author,
			Last_Edit: (command.Last_Edit) ? command.Last_Edit.valueOf() : null,
			Code: command.Code,
			Params: (command.Params) ? JSON.parse(command.Params) : [],
			Static_Data: command.Static_Data,
			Dynamic_Description: command.Dynamic_Description
		});
	});

	Router.get("/:identifier", async (req, res) => {
		return sb.WebUtils.apiDeprecated(req, res, {
			original: `/api/bot/command/${req.params.identifier}`,
			replacement: `/api/bot/command/detail/${req.params.identifier}`,
			timestamp: new sb.Date("2021-12-31 23:59:59.999").valueOf()
		});
	});

	return Router;
})();
