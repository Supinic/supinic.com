const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const commandRunQueryThreshold = 50_000;

	/**
	 * @api {post} /bot/command/list/ Command - list
	 * @apiName GetCommandList
	 * @apiDescription Posts a list of bot commands and their parameters
	 * @apiGroup Bot
	 * @apiParam {string} query Command string to execute
	 * @apiSuccess {string} reply
	 * @apiSuccess {string} [reason]
	 * @apiSuccess {boolean} [success]
	 * @apiPermission login
	 */
	Router.post("/run", async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return WebUtils.apiFail(res, auth.errorCode, auth.error);
		}
		else if (!WebUtils.compareLevels(auth.level, "login")) {
			return WebUtils.apiFail(res, 403, "Endpoint requires login");
		}

		const { userData } = auth;
		const prefix = sb.Config.get("COMMAND_PREFIX");
		if (!prefix) {
			return WebUtils.apiFail(res, 503, "Website configuration error - variable \"COMMAND_PREFIX\"");
		}

		const { query } = req.body;
		if (!query) {
			return WebUtils.apiFail(res, 400, "No command query provided");
		}
		else if (!query.startsWith(prefix)) {
			return WebUtils.apiFail(res, 400, "Command query must begin with the command prefix");
		}
		else if (query.length > commandRunQueryThreshold) {
			return WebUtils.apiFail(res, 400, `Command query is too long, ${query.length}/${commandRunQueryThreshold} characters`);
		}

		const [command, ...args] = query.split(/\s+/);
		if (!command.startsWith(prefix)) {
			return WebUtils.apiFail(res, 400, "Command invocation must begin with the command prefix");
		}

		let invocation = command;
		if (invocation.startsWith(prefix)) {
			invocation = invocation.replace(prefix, "");
		}

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
			return WebUtils.apiFail(res, response.statusCode, response.body.error.message);
		}
		else {
			const { result } = response.body.data;
			const data = {
				reply: result.reply ?? "(no message)",
				success: result.success,
				reason: result.reason ?? null
			};

			if (!result.reply) {
				if (result.reason === "cooldown") {
					data.reply = "You currently have a cooldown pending!";
				}
				else if (result.reason === "no-command") {
					data.reply = "That command does not exist!";
				}
				else if (result.reason === "whitelist") {
					data.reply = "You can't use this command as it whitelisted!";
				}
				else {
					data.reply = `Command execution failed: ${result.reason ?? "N/A"}`;
				}
			}

			return WebUtils.apiSuccess(res, data);
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
	 * @apiSuccess {string[]} command.aliases
	 * @apiSuccess {string} [command.description]
	 * @apiSuccess {number} command.cooldown
	 * @apiSuccess {string[]} command.flags
	 */
	Router.get("/list", async (req, res) => {
		let response;
		try {
			response = await sb.Got("Supibot", {
				url: `command/list`
			});
		}
		catch (e) {
			return WebUtils.apiFail(res, 504, "Could not reach internal Supibot API", {
				code: e.code,
				errorMessage: e.message
			});
		}

		if (response.statusCode !== 200) {
			return WebUtils.apiFail(res, response.statusCode, response.body.error?.message ?? "N/A");
		}
		else {
			return WebUtils.apiSuccess(res, response.body.data, {
				skipCaseConversion: true
			});
		}
	});

	/**
	 * @api {get} /bot/command/detail/:identifier Command - get data
	 * @apiName GetCommandData
	 * @apiDescription Fetches full data for a specific command.
	 * @apiGroup Bot
	 * @apiParam {string} includeDynamicDescription If true, the dynamic description will be provided.
	 * Otherwise, `null` will always be present.
	 * This is to prevent large swathes of string data from being sent if not necessary
	 * @apiPermission any
	 * @apiSuccess {string} command.name
	 * @apiSuccess {string[]} [command.aliases]
	 * @apiSuccess {string[]} [command.flags]
	 * @apiSuccess {string} [command.description]
	 * @apiSuccess {number} command.cooldown
	 * @apiSuccess {string} command.author
	 * @apiSuccess {Object[]} [command.params]
	 * @apiSuccess {string} command.params.name
	 * @apiSuccess {string} command.params.type
	 * @apiSuccess {string} [command.dynamicDescription]
	 */
	Router.get("/detail/:identifier", async (req, res) => {
		const searchParams = {
			command: req.params.identifier
		};

		if (req.query.includeDynamicDescription) {
			searchParams.includeDynamicDescription = "true";
		}

		const response = await sb.Got("Supibot", {
			url: "command/info",
			searchParams
		});

		if (response.statusCode !== 200) {
			return WebUtils.apiFail(res, response.statusCode, response.body.error?.message ?? null);
		}

		return WebUtils.apiSuccess(res, response.body.data.info, {
			skipCaseConversion: true
		});
	});

	Router.get("/:identifier", async (req, res) => WebUtils.apiDeprecated(req, res, {
		original: `/api/bot/command/${req.params.identifier}`,
		replacement: `/api/bot/command/detail/${req.params.identifier}`,
		timestamp: new sb.Date("2021-12-31 23:59:59.999").valueOf()
	}));

	return Router;
})();
