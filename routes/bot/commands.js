const Express = require("express");
const Router = Express.Router();

const User = require("../../modules/chat-data/user-alias.js");
const WebUtils = require("../../utils/webutils.js");

const baseGithubCommandPath = "https://github.com/Supinic/supibot/tree/master/commands";
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

const commandExecutionExamples = [
	{
		input: "$remindme Check pizza! in 15 minutes",
		output: "I will remind you in 15m, 0s (ID 123456789)"
	}
];

module.exports = (function () {
	"use strict";

	Router.get("/run", async (req, res) => {
		const { userID } = await WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before running Supibot commands"
			});
		}

		const example = sb.Utils.randArray(commandExecutionExamples);
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
					placeholder: `Example: ${example.input}`
				},
				{
					id: "output",
					name: "Output",
					type: "memo",
					placeholder: `Example: ${example.output}`,
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
		const response = await sb.Got.get("Supinic")({
			url: "bot/commands/list"
		});

		let isDeveloper = false;
		if (res.locals.authUser?.userData) {
			const flag = await User.getDataProperty(res.locals.authUser.userData.ID, "developer");
			isDeveloper = Boolean(flag);
		}

		const { data } = response.body;
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
				"🚫": (i.flags.includes("optOut")) ? "Yes" : "No",
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

	Router.get("/detail/:identifier", async (req, res) => {
		const name = req.params.identifier;
		const identifier = encodeURIComponent(name);
		const response = await sb.Got.get("Supinic")({
			url: `bot/command/detail/${identifier}`,
			searchParams: {
				includeDynamicDescription: "true"
			}
		});

		if (response.statusCode !== 200) {
			return WebUtils.handleError(res, response.statusCode, response.body.error?.message);
		}

		const commandInfo = response.body.data;
		let authorIdentifier = commandInfo.author ?? "N/A";
		if (Array.isArray(authorIdentifier)) {
			const list = authorIdentifier.map(i => `<li>${i}</li>`).join("");
			authorIdentifier = `<ul>${list}</ul>`;
		}

		const data = {
			Name: commandInfo.name,
			Aliases: (commandInfo.aliases.length === 0)
				? "N/A"
				: commandInfo.aliases.join(", "),
			Description: commandInfo.description ?? "N/A",
			Cooldown: `${commandInfo.cooldown / 1000} seconds`,
			Author: authorIdentifier,
			"Dynamic description": (commandInfo.dynamicDescription)
				? commandInfo.dynamicDescription.join("<br>")
				: "N/A"
		};

		const auth = await WebUtils.getUserLevel(req, res);
		if (auth.userID) {
			const response = await sb.Got.get("Supibot")({
				url: "filter/userCommand",
				searchParams: {
					userID: auth.userID,
					command: name
				}
			});

			if (response.statusCode !== 200) {
				data.Optout = "Optout data could not be loaded!";
				data.Blocks = "Blocks data could not be loaded!";
			}
			else {
				const {
					optout,
					blocks
				} = response.body.data;

				const optoutStatus = (optout) ? "are" : "are <b>not</b>";
				data.Optout = `You ${optoutStatus} opted out from this command`;

				if (blocks.length === 0) {
					data.Blocks = "You are <b>not</b> currently blocking anyone from this command.";
				}
				else {
					const list = blocks.map(i => `<li>${i.blockedUsername}</li>`)
						.join("");
					data.Blocks = `You are curently blocking the following users from this command: <ul>${list}</ul>`;
				}
			}
		}

		const filterResponse = await sb.Got.get("Supibot")({
			url: `filter/command`,
			throwHttpErrors: false,
			searchParams: {
				identifier
			}
		});

		const filterData = (filterResponse.statusCode === 200) ? filterResponse.body.data : [];
		const restrictions = {};
		for (const filter of filterData) {
			restrictions[filter.type] ??= [];

			let string;
			const where = (filter.channelName)
				? `in <u>${filter.channelDescription ?? filter.channelName}</u>`
				: "everywhere";

			if (filter.type === "Opt-out") {
				const shortWhere = (filter.channelName)
					? `in <u>${filter.channelDescription ?? filter.channelName}</u>`
					: "";
				const target = (filter.blockedUsername)
					? `for @${filter.blockedUsername}`
					: ``;

				string = `${filter.username} ${shortWhere} ${target}`;
			}
			else if (filter.type === "Whitelist" && commandInfo.flags.whitelist) {
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
				if (filter.invocation !== null && filter.invocation !== commandInfo.name) {
					string += ` (${filter.invocation})`;
				}

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
		         aria-controls="${type.toLowerCase()}"
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

		data.Code = `<a target="_blank" href="${baseGithubCommandPath}/${encodeURIComponent(commandInfo.name)}/index.js">Open in new tab</a>`;

		res.render("generic-detail-table", {
			data,
			header: `${commandInfo.prefix}${commandInfo.name}`,
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

	Router.get("/detail/:identifier/code", async (req, res) => WebUtils.apiFail(res, 410, "Endpoint retired"));

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
