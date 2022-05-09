module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const commandRunQueryThreshold = 50_000;

	/**
	 * @api {post} /bot/command/list/ Command - list
	 * @apiName GetCommandList
	 * @apiDescription Posts a list of bot commands and their parameters
	 * @apiGroup Bot
	 * @apiParam {string} query Command string to execute
	 * @apiPermission login
	 */
	Router.post("/run", async (req, res) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return sb.WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return sb.WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const { userData } = auth;
		const { prefix, prefixRegex } = sb.Command;
		const { query } = req.body;
		if (!query) {
			return sb.WebUtils.apiFail(res, 400, "No command query provided");
		}
		else if (!query.startsWith(prefix)) {
			return sb.WebUtils.apiFail(res, 400, "Command query must begin with the command prefix");
		}
		else if (query.length > commandRunQueryThreshold) {
			return sb.WebUtils.apiFail(res, 400, `Command query is too long, ${query.length}/${commandRunQueryThreshold} characters`);
		}

		const [command, ...args] = query.split(/\s+/);
		if (!command.startsWith(prefix)) {
			return sb.WebUtils.apiFail(res, 400, "Command invocation must begin with the command prefix");
		}

		const invocation = command.replace(prefixRegex, "");
		const response = await sb.Got("Supibot", {
			url: "command/execute",
			searchParams: {
				invocation,
				platform: "twitch",
				channel: null,
				user: userData.Name,
				arguments: args.join(" ")
			}
		});

		if (response.body.error) {
			return sb.WebUtils.apiFail(res, response.statusCode, response.body.error.message);
		}
		else {
			const { result } = response.body.data;
			if (!result.reply) {
				if (result.reason === "cooldown") {
					result.reply = "You currently have a cooldown pending!";
				}
				else if (result.reason === "no-command") {
					result.reply = "That command does not exist!";
				}
			}

			return sb.WebUtils.apiSuccess(res, {
				reply: result.reply ?? "(no message)"
			});
		}
	});

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
		const commandsData = sb.Command.definitions;
		const data = commandsData.map(i => ({
			Name: i.Name,
			Aliases: i.Aliases ?? [],
			Description: i.Description,
			Cooldown: i.Cooldown,
			Flags: i.Flags ?? []
		}));

		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /bot/command/detail/:identifier Command - get data
	 * @apiName GetCommandData
	 * @apiDescription Fetches full data for a specific command.
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiSuccess {string} command.name
	 * @apiSuccess {string[]} [command.aliases]
	 * @apiSuccess {string[]} [command.flags]
	 * @apiSuccess {string} [command.description]
	 * @apiSuccess {number} command.cooldown
	 * @apiSuccess {string} command.author
	 * @apiSuccess {string} command.code
	 * @apiSuccess {Object[]} [command.params]
	 * @apiSuccess {string} command.params.name
	 * @apiSuccess {string} command.params.type
	 * @apiSuccess {string} [command.staticData]
	 * @apiSuccess {string} [command.dynamicDescription]
	 */
	Router.get("/detail/:identifier", async (req, res) => {
		const commandData = sb.Command.get(req.params.identifier);
		if (!commandData) {
			return sb.WebUtils.apiFail(res, 404, "Command does not exist");
		}

		const definition = sb.Command.definitions.find(i => i.Name === commandData.Name);
		if (!definition) {
			return sb.WebUtils.apiFail(res, 404, "Command definition does not exist");
		}

		return sb.WebUtils.apiSuccess(res, {
			Name: definition.Name,
			Aliases: definition.Aliases,
			Flags: definition.Flags,
			Description: definition.Description,
			Cooldown: definition.Cooldown,
			Author: definition.Author,
			Code: definition.Code.toString(),
			Params: definition.Params ?? [],
			Static_Data: (definition.Static_Data)
				? definition.Static_Data.toString()
				: null,
			Dynamic_Description: (definition.Dynamic_Description)
				? definition.Dynamic_Description.toString()
				: null
		});
	});

	Router.get("/:identifier", async (req, res) => sb.WebUtils.apiDeprecated(req, res, {
		original: `/api/bot/command/${req.params.identifier}`,
		replacement: `/api/bot/command/detail/${req.params.identifier}`,
		timestamp: new sb.Date("2021-12-31 23:59:59.999").valueOf()
	}));

	return Router;
})();
