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

	Router.get("/run", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before running Supibot commands"
			});
		}

		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Run a Supibot command</h5>
	            <div id="alert-anchor"></div>
			`,
			append: sb.Utils.tag.trim `
				<h6 class="pt-3 text-center text-muted">The commands are executed as if you were whispering Supibot on Twitch.</h6>
			`,
			extraCSS: `
				textarea.loading {
				    background-image: url("/static/img/ppCircle.gif");
				    background-repeat: no-repeat;
				    background-position: center;
				    background-size: contain;
				}
			`,
			onSubmit: "submit()",
			fields: [
				{
					id: "input",
					name: "Input",
					type: "memo",
					placeholder: "Your Supibot command text goes here - just like in chat, prefix included"
				},
				{
					id: "output",
					name: "Output",
					type: "memo",
					disabled: true
				}
			],
			script: sb.Utils.tag.trim `
				async function submit () {
					const alerter = document.getElementById("alert-anchor");
					const button = document.getElementById("submit-button");
					alerter.classList.remove("alert", "alert-danger");
					alerter.innerHTML = "";
					
					const input = document.getElementById("input");
					const output = document.getElementById("output");
					
					output.value = "";
					output.classList.add("loading");
					button.disabled = true;
					
					const response = await fetch("/api/bot/command/run", {
						method: "POST",
						headers: {
							"Content-Type": "application/json"
						},
						body: JSON.stringify({
							query: input.value
						})
					});
					
					const { data, error } = await response.json();	
					
					output.classList.remove("loading");		
					button.disabled = false;
						
					if (error) {					
						alerter.classList.add("alert");
						alerter.classList.add("alert-danger");						
						alerter.innerHTML = error.message ?? "(empty error message)";
					}
					else {					
						output.value = data.reply ?? "(empty message)";
					}
				}
			`
		});
	});

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "bot/command/list").json();

		let isDeveloper = false;
		if (res.locals.authUser?.userData) {
			isDeveloper = Boolean(await res.locals.authUser.userData.getDataProperty("developer"));
		}

		const printData = data
			.filter(i => {
				if (isDeveloper) {
					return true;
				}

				return (!i.flags?.includes("developer") && !i.flags?.includes("whitelist"));
			})
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
		const response = await sb.Got("Supinic", {
			url: `bot/command/detail/${identifier}`,
			searchParams: {
				includeDynamicDescription: "true"
			}
		});

		if (response.statusCode !== 200) {
			return sb.WebUtils.handleError(res, response.statusCode, response.body.error?.message);
		}

		const commandInfo = response.body.data;
		const data = {
			Name: commandInfo.name,
			Aliases: (commandInfo.aliases.length === 0)
				? "N/A"
				: commandInfo.aliases.join(", "),
			Description: commandInfo.description ?? "N/A",
			Cooldown: `${commandInfo.cooldown / 1000} seconds`,
			Author: commandInfo.author ?? "N/A",
			"Dynamic description": (commandInfo.dynamicDescription)
				? commandInfo.dynamicDescription.join("<br>")
				: "N/A"
		};

		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.userID) {
			const response = await sb.Got("Supibot", {
				url: "command/userFilters",
				searchParams: {
					userID: auth.userID,
					command: identifier
				}
			});

			const { optout, blocks } = response.body;

			const optoutStatus = (optout) ? "are" : "are <b>not</b>";
			data.Optout = `You ${optoutStatus} opted out from this command`;

			if (blocks.length === 0) {
				data.Blocks = "You are <b>not</b> currently blocking anyone from this command.";
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
				const shortWhere = (filter.channelName)
					? `in <u>${filter.channelDescription ?? filter.channelName}</u>`
					: "";
				const target = (filter.blockedUsername)
					? `for @${filter.blockedUsername}`
					: ``;

				string = `${filter.username} ${shortWhere} ${target}`;
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

		data.Code = `<a target="_blank" href="${baseGithubCommandPath}/${identifier}/index.js">Open in new tab</a>`;

		const commandPrefix = sb.Config.get("COMMAND_PREFIX");
		res.render("generic-detail-table", {
			data,
			header: `${commandPrefix}${commandInfo.name}`,
			title: `Command detail - ${commandInfo.name}`,
			openGraphDefinition: [
				{
					property: "title",
					content: `Command ${commandInfo.name}`
				},
				{
					property: "description",
					content: commandInfo.description ?? "(no description available)"
				}
			]
		});
	});

	Router.get("/detail/:identifier/code", async (req, res) => {
		const commandData = sb.Command.get(req.params.identifier);
		if (!commandData) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Command does not exist"
			});
		}

		const redirectUrl = `${baseGithubCommandPath}/${commandData.Name}/index.js`;
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
