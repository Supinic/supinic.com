/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Command = require("../../modules/chat-data/command.js");
	const CommandExecution = require("../../modules/chat-data/command-execution.js");
	const Filter = require("../../modules/chat-data/filter.js");

	Router.get("/", async (req, res) => {
		res.redirect("/bot/commands/list");
	});

	Router.get("/list", async (req, res) => {
		const rawData = await Command.selectAll();

		const data = rawData.filter(i => !i.System && !i.Archived).map(i => ({
			Name: i.Name,
			Aliases: (i.Aliases) ? JSON.parse(i.Aliases).join(", ") : "",
			Cooldown: {
				value: (i.Cooldown / 1000) + " seconds",
				dataOrder: (i.Cooldown / 1000)
			},
			Whitelisted: (i.Whitelisted) ? "Yes" : "No",
			Description: i.Description || "N/A",
			ID: `<a href="/bot/command/${i.ID}">${i.ID}</a>`
		})).sort((a, b) => a.Name.localeCompare(b.Name));

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 100
		});

		// const css = "<style type='text/css'>body { background-color:#111; color: white; } a:visited { color:darkviolet; } a { color:dodgerblue; } </style>";
		// const data = await Command.getAll();
		// const header = `<thead><td><b>Name</b></td><td><b>Aliases</b></td><td><b>Whitelisted</b></td></td><td><b>Description</b></td><td><b>Cooldown</b></td></thead>`;
		// const table = data.filter(i => !i.System).sort((a, b) => a.Name.localeCompare(b.Name)).map(row => {
		// 	const aliases = (row.Aliases) ? eval(row.Aliases).join(", ") : "";
		//
		// 	return [
		// 		"<tr>",
		// 			"<td>" + row.Name + "</td>",
		// 			"<td>" + aliases + "</td>",
		// 			"<td>" + (row.Whitelisted ? "<b>Yes</b>" : "") + "</td>",
		// 			"<td>" + row.Description + "</td>",
		// 			"<td>" + (row.Cooldown / 1000 + " sec") + "</td>",
		// 		"</tr>"
		// 	].join("");q
		// }).join("");
		//
		// const html = `${css}<table>${header}${table}</table>`;
		//
		// res.set("Content-Type", "text/html");
		// res.send(html);
	});

	Router.get("/stats", async (req, res) => {
		const [statistics, start] = await Promise.all([
			CommandExecution.hourlyStats(),
			CommandExecution.selectSingleCustom(rs => rs
				.orderBy("Executed ASC")
				.limit(1)
			)
		]);

		res.render("command-stats", {
			amount: statistics.reduce((acc, cur) => acc += cur, 0),
			hourlyStats: JSON.stringify(statistics),
			start: start.Executed.format("Y-m-d H:i")
		});
	});

	Router.get("/:id", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "Invalid or malformed ID"
			});
		}

		const rawData = await Command.getRow(ID);
		if (!rawData) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "ID is out of bounds"
			});
		}

		const skip = ["static data", "examples", "rollbackable", "system", "read only", "ping", "skip banphrases", "whitelisted", "whitelist response", "code"];
		const commandPrefix = sb.Config.get("COMMAND_PREFIX");
		const data = {};

		for (const [rawKey, value] of Object.entries(rawData.values)) {
			const key = rawKey.replace(/_/g, " ");
			if (key === "Dynamic Description") {
				data[key] = (value)
					? (await eval(value)(commandPrefix)).join("<br>")
					: "N/A";
			}
			else if (key === "Aliases" && value !== null) {
				data[key] = JSON.parse(value).join(", ");
			}
			else if (key === "Cooldown") {
				data[key] = (value / 1000) + " seconds";
			}
			else if (skip.includes(key.toLowerCase())) {
				continue;
			}
			else if (value === null) {
				data[key] = "N/A";
			}
			else {
				data[key] = value;
			}
		}

		const restrictions = await Filter.selectMultipleCustom(rs => rs
			.select("User_Alias.Name AS Username")
			.select("Channel.Name as Channel_Name", "Channel.Mode AS Channel_Mode")
			.select("Platform.Name as Platform_Name")
			.where("Command = %n", ID)
			.where("Active = %b", true)
			.where("Channel IS NULL OR Channel.Mode <> %s", "Inactive")
			.leftJoin("chat_data", "User_Alias")
			.leftJoin("chat_data", "Channel")
			.leftJoin({
				toDatabase: "chat_data",
				toTable: "Platform",
				on: "Channel.Platform = Platform.ID"
			})
			.orderBy("Username ASC")
		);

		data.Code = `<a target="_blank" href="/bot/command/${data.ID}/code">Open in new tab</a>`;

		const prefix = (rawData.values.Whitelisted) ? "Only " : "";
		data.Restrictions = restrictions.filter(i => i.Channel_Mode !== "Inactive" && i.Channel_Mode !== "Read").map(i => {
			if (i.Type === "Opt-out") {
				return i.Username + " opted out from this command";
			}
			else if (i.Type === "Whitelist") {
				const who = i.Username || "Everyone";
				const where = (i.Channel_Name) ? (`in ${i.Platform_Name} channel ${i.Channel_Name}`) : "everywhere";
				return (i.Username)
						? `${prefix}<u>${who}</u> can use this command ${where}`
						: `<u>${who}</u> can use this command ${prefix.toLowerCase()} ${where}`
			}
			else if (i.Type === "Blacklist") {
				if (i.Username) {
					const where = (i.Channel_Name) ? (`in ${i.Platform_Name} channel ${i.Channel_Name}`) : "everywhere";
					return `${i.Username} is banned from using this command ${where}`;
				}
				else if (i.Channel_Name) {
					return `This command is disabled in ${i.Platform_Name} channel ${i.Channel_Name}`;
				}
			}
		}).filter(Boolean).join("<br>") || "N/A";

		res.render("generic-detail-table", {
			data: data
		});
	});

	Router.get("/:id/code", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "Invalid or malformed ID"
			});
		}

		let data = null;
		try {
			data = await Command.getRow(ID);
		}
		catch (e) {
			console.error(e);
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "ID is out of bounds"
			});
		}

		res.render("code", {
			header: data.values.Name,
			code: data.values.Code,
			link: `<a href="https://github.com/Supinic/supibot-sql/blob/master/commands/${data.values.Name}.sql">Github link</a>`
		});
	});

	Router.get("/:channel/", async (req, res) => {
		res.set("Content-Type", "text/html");
		res.send("NYI");
	});

	Router.get("/:channel/:user", async (req, res) => {
		res.set("Content-Type", "text/html");
		res.send("NYI");
	});

	return Router;
})();
