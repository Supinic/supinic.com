module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const CommandExecution = require("../../modules/chat-data/command-execution.js");

	const baseGithubCommandPath = "https://github.com/Supinic/supibot-package-manager/tree/master/commands";
	const filterTypeMap = {
		Blacklist: "These users/channels are banned from this command",
		Whitelist: "Only these users/channels can use this command",
		"Opt-out": "These users opted out from this command",
		Arguments: "Disabled specific arguments",
		"Offline-only": "Only available while channel is offline",
		"Online-only": "Only available while channel is online",
		Unmention: "These users will not be mentioned by this command",
		Unping: "These users will not be \"pinged\" by this command"
	};

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "bot/command/list").json();

		const isDeveloper = Boolean(res.locals.authUser?.userData?.Data.developer);
		const printData = data
			.filter(i => isDeveloper || !i.flags?.includes("developer"))
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(i => ({
				Name: `<a href="/bot/command/detail/${encodeURIComponent(i.name)}">${i.name}</a>`,
				Description: i.description || "N/A",
				"👤": (i.aliases.length > 0)
					? `<div class="hoverable" title="Aliases: ${i.aliases.join(", ")}">Yes</div>`
					: "No",
				"🚫": (i.flags.includes("opt-out")) ? "Yes" : "No",
				"⛔": (i.flags.includes("block")) ? "Yes" : "No",
				searchables: (i.aliases.length > 0) ? i.aliases.join(" ") : ""
			}));

		res.render("generic-list-table", {
			title: "Supibot command list",
			data: printData,
			head: ["Name", "Description", "👤", "🚫", "⛔"],
			pageLength: 250,
			headerDescriptions: {
				"👤": "Does this command have any aliases? (hover for a list)",
				"🚫": "Can you opt out from this command?",
				"⛔": "Can you block a specific user from this command?"
			},
			extraCSS: `
				th[aria-label^="Name"] {
					min-width: 105px;
				}
			`,
			openGraphDefinition: [
				{
					property: "title",
					content: `Supibot command list`
				},
				{
					property: "description",
					content: "This is a list of all Supibot commands available."
				}
			]
		});
	});

	Router.get("/stats", async (req, res) => {
		const statistics = await CommandExecution.hourlyStats();
		res.render("command-stats", {
			title: "Hourly stats of Supibot commands",
			amount: statistics.reduce((acc, cur) => (acc += cur), 0),
			hourlyStats: JSON.stringify(statistics),
			openGraphDefinition: [
				{
					property: "title",
					content: `Hourly Supibot command stats`
				},
				{
					property: "description",
					content: "Shows how many times Supibot commands are used in each hour of a day, for the previous 24 hours."
				}
			]
		});
	});

	Router.get("/detail/:identifier", async (req, res) => {
		const identifier = encodeURIComponent(req.params.identifier);
		const response = await sb.Got("Supinic", `bot/command/detail/${identifier}`);
		if (response.statusCode !== 200) {
			return res.status(response.statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(response.statusCode),
				message: response.body.error?.message ?? "N/A"
			});
		}

		const properties = {
			name: "Name",
			aliases: "Aliases",
			description: "Description",
			cooldown: "Cooldown",
			dynamicDescription: "Dynamic description",
			author: "Author",
			lastEdit: "Last edit"
		};

		const commandDefinition = response.body.data;
		const skip = ["params", "static data", "examples", "rollbackable", "system", "read only", "mention", "skip banphrases", "whitelisted", "code", "latest commit"];
		const commandPrefix = sb.Config.get("COMMAND_PREFIX");
		const data = {};

		for (const [key, name] of Object.entries(properties)) {
			const value = commandDefinition[key];
			if (key === "dynamicDescription") {
				if (value) {
					const commandData = sb.Command.get(commandDefinition.name);
					const descriptionFunction = eval(`(${value})`).bind(commandData);

					const mockedCommandData = {
						...commandData,
						getStaticData: () => {
							console.debug("Deprecated getStaticData() call", commandData.name);
							return commandData.staticData;
						}
					};

					const result = await descriptionFunction(commandPrefix, mockedCommandData);

					data[name] = result.join("<br>");
				}
				else {
					data[name] = "N/A";
				}
			}
			else if (key === "flags") {
				if (value === null) {
					data[name] = "none";
				}
				else {
					const list = value.map(i => `<li>${i}</li>`).join("");
					data[name] = `<ul>${list}</ul>`;
				}
			}
			else if (key === "lastEdit") {
				if (value) {
					const date = new sb.Date(value);
					data[name] = `${date.format("Y-m-d H:i:s")} (${sb.Utils.timeDelta(date)})`;
				}
				else {
					data[name] = "N/A";
				}
			}
			else if (key === "latestCommit" && value !== null) {
				data[name] = `<a target="_blank" href="//github.com/Supinic/supibot-package-manager/commit/${value}">${value}</a>`;
			}
			else if (key === "aliases") {
				data[name] = (value && value.length > 0)
					? value.join(", ")
					: "N/A";
			}
			else if (key === "cooldown") {
				data[name] = `${value / 1000} seconds`;
			}
			else if (value === null) {
				data[name] = "N/A";
			}
			else if (!skip.includes(key.toLowerCase())) {
				data[name] = value;
			}
		}

		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.userID) {
			const check = await sb.Query.getRecordset(rs => rs
				.select("ID")
				.from("chat_data", "Filter")
				.where("Command = %s", commandDefinition.name)
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
				.where("Command = %s", commandDefinition.name)
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

		const { data: filterData } = await sb.Got("Supinic", `bot/filter/command/${identifier}/list`).json();
		const restrictions = {};

		for (const filter of filterData) {
			if (!restrictions[filter.type]) {
				restrictions[filter.type] = [];
			}

			let string;
			const where = (filter.channelName)
				? `in <u>${filter.channelDescription ?? filter.channelName}</u>`
				: "everywhere";

			if (filter.type === "Opt-out" || filter.type === "Unmention" || filter.type === "Unping") {
				string = filter.username;
			}
			else if (filter.type === "Whitelist") {
				string = (filter.username)
					? `${filter.username} ${where}`
					: `everyone ${where}`;
			}
			else if (filter.type === "Blacklist") {
				string = (filter.username)
					? `Ban: ${filter.username} ${where}`
					: `Disabled ${where}`;
			}
			else if (filter.type === "Offline-only" || filter.type === "Online-only") {
				string = (filter.username)
					? `${filter.username} ${where}`
					: `everyone ${where}`;
			}
			else if (filter.type === "Arguments") {
				const { args } = filter.data;
				const list = args.map(i => `position ${i.index}, "${i.string}"`);

				string = `${sb.Utils.capitalize(where)}: ${list.join("; ")}`;
			}

			if (string) {
				restrictions[filter.type].push(string);
			}
		}

		const restrictionItems = [];
		for (const [type, filters] of Object.entries(restrictions)) {
			if (filters.length === 0) {
				continue;
			}

			const filterItems = filters.sort().map(i => `<li>${i}</li>`);
			const filterList = `<ul id="${type.toLowerCase()}" class="collapse">${filterItems.join("")}</ul>`;
			const section = sb.Utils.tag.trim `<a
				 class="btn btn-primary"
				 href="#${type.toLowerCase()}"
				 role="button"
				 data-toggle="collapse"
		         aria-expanded="false"
		         aria-controls=""${type.toLowerCase()}"
		         style="margin:3px"
	            >
	                ${filterTypeMap[type] ?? type}
                </a>
            `;

			restrictionItems.push(`${section}${filterList}`);
		}

		data.Restrictions = (restrictionItems.length === 0)
			? "N/A"
			: restrictionItems.join("<br>");

		data.Code = `<a target="_blank" href="${baseGithubCommandPath}/${identifier}">Open in new tab</a>`;

		res.render("generic-detail-table", {
			data,
			header: `$${commandDefinition.name}`,
			title: `Command detail - ${commandDefinition.name}`,
			openGraphDefinition: [
				{
					property: "title",
					content: `Command ${commandDefinition.name}`
				},
				{
					property: "description",
					content: commandDefinition.description ?? "(no description available)"
				}
			]
		});
	});

	Router.get("/detail/:identifier/code", async (req, res) => {
		const redirectUrl = `${baseGithubCommandPath}/${identifier}`;
		res.redirect(redirectUrl);
	});

	Router.get("/channel/:channel/", async (req, res) => {
		res.set("Content-Type", "text/html");
		res.send("NYI");
	});

	Router.get("/channel/:channel/user/:user", async (req, res) => {
		res.set("Content-Type", "text/html");
		res.send("NYI");
	});

	return Router;
})();
