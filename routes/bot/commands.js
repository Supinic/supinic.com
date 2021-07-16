module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Command = require("../../modules/chat-data/command.js");
	const CommandExecution = require("../../modules/chat-data/command-execution.js");

	const filterTypeMap = {
		Blacklist: "These users/channels are banned from this command",
		Whitelist: "Only these users/channels can use this command",
		"Opt-out": "These users opted out from this command",
		Arguments: "Disabled specific arguments",
		"Offline-only": "Only available while channel is offline",
		"Online-only": "Only available while channel is online",
		Unmention: "These users will not be mentioned by this command",
		Unping: "These users will not be \"pinged\" by this command",
	};

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "bot/command/list").json();

		const isDeveloper = Boolean(res.locals.authUser?.userData?.Data.developer);
		const printData = data
			.filter(i => isDeveloper || !i.flags.includes("developer"))
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(i => ({
				Name: `<a href="/bot/command/${i.ID}">${i.name}</a>`,
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
				data[key] = `${value / 1000} seconds`;
			}
			else if (value === null) {
				data[key] = "N/A";
			}
			else if (!skip.includes(key.toLowerCase())) {
				data[key] = value;
			}
		}

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

		const { data: filterData } = await sb.Got("Supinic", `bot/filter/command/${ID}/list`).json();
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

		data.Code = `<a target="_blank" href="/bot/command/${data.ID}/code">Open in new tab</a>`;

		res.render("generic-detail-table", {
			data,
			title: `Command detail - ${data.Name}`,
			openGraphDefinition: [
				{
					property: "title",
					content: `Command ${data.Name}`
				},
				{
					property: "description",
					content: data.Description ?? "(no description available)"
				}
			]
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
			? JSON.stringify(JSON.parse(data.values.Params), null, 4)
			: "// None";

		res.render("code", {
			title: `${data.values.Name} - Supibot command code`,
			header: data.values.Name,
			code: `// Command code:\n${data.values.Code}`,
			staticData: `// Static data:\n${data.values.Static_Data ?? "// None"}`,
			dynamicDescription: `// Dynamic description:\n${data.values.Dynamic_Description ?? "// None"}`,
			params: `// Parameters definition:\n${paramsString}`,
			link: `https://github.com/Supinic/supibot-package-manager/blob/master/commands/${encodeURI(data.values.Name)}/index.js`,
			openGraphDefinition: [
				{
					property: "title",
					content: `Code of Supibot command ${data.values.Name}`
				}
			]
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
