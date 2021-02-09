/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Command = require("../../modules/chat-data/command.js");
	const CommandExecution = require("../../modules/chat-data/command-execution.js");
	const Filter = require("../../modules/chat-data/filter.js");

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "bot/command/list").json();

		const isDeveloper = Boolean(res.locals.authUser?.userData.Data.developer);
		const printData = data.filter(i => isDeveloper || !i.flags.includes("developer"))
			.map(i => ({
				Name: i.name,
				Aliases: (i.aliases.length > 0) ? i.aliases.join(", ") : "(none)",
				Cooldown: {
					value: (i.cooldown / 1000) + " seconds",
					dataOrder: (i.cooldown / 1000)
				},
				Whitelisted: (i.flags.includes("whitelist")) ? "Yes" : "No",
				Description: i.description || "N/A",
				ID: `<a href="/bot/command/${i.ID}">${i.ID}</a>`
			}))
			.sort((a, b) => a.Name.localeCompare(b.Name));

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 250
		});
	});

	Router.get("/stats", async (req, res) => {
		const statistics = await CommandExecution.hourlyStats();
		res.render("command-stats", {
			amount: statistics.reduce((acc, cur) => acc += cur, 0),
			hourlyStats: JSON.stringify(statistics)
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

		const auth = await sb.WebUtils.getUserLevel(req, res);
		const skip = ["params", "static data", "examples", "rollbackable", "system", "read only", "mention", "skip banphrases", "whitelisted", "whitelist response", "code"];
		const commandPrefix = sb.Config.get("COMMAND_PREFIX");
		const data = {};

		for (const [rawKey, value] of Object.entries(rawData.values)) {
			const key = rawKey.replace(/_/g, " ");
			if (key === "Dynamic Description") {
				if (value) {
					const values = { ...rawData.valuesObject };
					const fakeCommand = {
						ID: values.ID,
						getCacheKey: () => sb.Command.prototype.getCacheKey.apply(fakeCommand)
					};

					values.getCacheData = sb.Command.prototype.getCacheData.bind(fakeCommand);
					values.getStaticData = function () {
						this.data = {};
						const resolver = eval(this.Static_Data);
						if (typeof resolver === "function") {
							return resolver.apply(this);
						}
						else {
							return resolver;
						}
					};

					const fn = eval(value);
					const result = await fn(commandPrefix, values);

					data[key] = result.join("<br>");
				}
				else {
					data[key] = "N/A";
				}
			}
			else if (key === "Flags") {
				if (value === null) {
					data[key] = "none";
				}
				else {
					const list = value.map(i => `<li>${i}</li>`).join("");
					data[key] = `<ul>${list}</ul>`;
				}
			}
			else if (key === "Last Edit") {
				data[key] = (value)
					? `${value.format("Y-m-d H:i:s")} (${sb.Utils.timeDelta(value)})`
					: "N/A";
			}
			else if (key === "Latest Commit" && value !== null) {
				data[key] = `<a target="_blank" href="//github.com/Supinic/supibot-package-manager/commit/${value}">${value}</a>`;
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
			.select("IFNULL(Channel.Description, Channel.Name) as Channel_Name", "Channel.Mode AS Channel_Mode")
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

		if (auth.userID) {
			const check = await sb.Query.getRecordset(rs => rs
				.select("ID")
				.from("chat_data", "Filter")
				.where("Command = %n", ID)
				.where("User_Alias = %n", auth.userID)
				.where("Type = %s", "Opt-out")
				.where("Active = %b", true)
				.single()
			);

			const status = (check?.ID) ? "are" : "are <b>not</b>";
			data.Optout = `You ${status} opted out from this command`;

			const blocks = await sb.Query.getRecordset(rs => rs
				.select("User_Alias.Name AS Username")
				.from("chat_data", "Filter")
				.join({
					toTable: "User_Alias",
					on: "Filter.Blocked_User = User_Alias.ID"
				})
				.where("Command = %n", ID)
				.where("User_Alias = %n", auth.userID)
				.where("Type = %s", "Block")
				.where("Active = %b", true)
			);

			if (blocks.length === 0) {
				data.Blocks = "You are not currently blocking anyone from this command.";
			}
			else {
				const list = blocks.map(i => `<li>${i.Username}</li>`).join("");
				data.Blocks = `You are curently blocking the following users from this command: <ul>${list}</ul>`;
			}
		}

		const prefix = (rawData.Flags?.includes("whitelist")) ? "Only " : "";
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

		if (data.Flags.includes("whitelist")) {
			data.Restrictions = `<b>Only available for these combinations:</b><br><br>${data.Restrictions}`;
		}

		data.Code = `<a target="_blank" href="/bot/command/${data.ID}/code">Open in new tab</a>`;

		res.render("generic-detail-table", {
			data,
			title: `Command detail - ${data.Name}`
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
				message: "Malformed command ID"
			});
		}

		if (!data) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "Command ID is out of bounds"
			});
		}

		const paramsString = (data.values.Params)
			? JSON.stringify(JSON.parse(data.value.Params), null, 4)
			: "// None";

		res.render("code", {
			header: data.values.Name,
			code: `// Command code:\n${data.values.Code}`,
			staticData: `// Static data:\n${data.values.Static_Data ?? "// None"}`,
			dynamicDescription: `// Dynamic description:\n${data.values.Dynamic_Description ?? "// None"}`,
			params: `// Parameters definition:\n${paramsString}`,
			link: `https://github.com/Supinic/supibot-package-manager/blob/master/commands/${encodeURI(data.values.Name)}/index.js`
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
