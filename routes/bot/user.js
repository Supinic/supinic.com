module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const createAliasDetailTable = (res, aliasData) => {
		const created = (aliasData.created) ? new sb.Date(aliasData.created).format("Y-m-d") : "N/A";
		const edited = (aliasData.edited) ? new sb.Date(aliasData.edited).format("Y-m-d") : "N/A";

		const args = aliasData.arguments ?? [];
		const invocation = (aliasData.invocation)
			? `${aliasData.invocation} ${args.join(" ")}`
			: "N/A";

		res.render("generic-detail-table", {
			title: `Alias ${aliasData.name} of user ${aliasData.userName}`,
			data: {
				User: aliasData.userName,
				Alias: aliasData.name,
				Created: created,
				Edited: edited,
				Description: (aliasData.description)
					? sb.Utils.escapeHTML(aliasData.description)
					: "N/A",
				Invocation: (aliasData.invocation)
					? `<code>${sb.Utils.escapeHTML(invocation)}</code>`
					: "N/A"
			},
			openGraphDefinition: [
				{
					property: "title",
					content: `Alias ${aliasData.name} of user ${aliasData.userName}`
				},
				{
					property: "description",
					content: aliasData.description ?? invocation ?? "N/A"
				},
				{
					property: "author",
					content: aliasData.userName
				}
			]
		});
	}

	Router.get("/alias/find", async (req, res) => {
		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Search for another user's aliases</h5>
	            <div id="alert-anchor"></div>
			`,
			onSubmit: "submit()",
			fields: [
				{
					id: "user-name",
					name: "User name",
					type: "string"
				}
			],
			script: sb.Utils.tag.trim `
				async function submit (element) {
					const userName = encodeURIComponent(document.getElementById("user-name").value).toLowerCase();
					const alerter = document.getElementById("alert-anchor");
						
					const response = await fetch("/api/bot/user/resolve/name/" + userName);
					const { data } = await response.json();
					if (data) {					
						location.href = "/bot/user/" + userName + "/alias/list";
					}
					else {
						alerter.classList.add("alert");
						alerter.classList.add("alert-danger");
						alerter.innerHTML = "User was not found!";
					}
				}
			`
		});
	});

	Router.get("/alias/detail/:id", async (req, res) => {
		const response = await sb.Got("Supinic", {
			url: `bot/user/alias/detail/${req.params.id}`,
			throwHttpErrors: false
		});

		if (response.statusCode !== 200) {
			return res.status(404).render("error", {
				error: response.statusCode,
				message: response.body.error.message
			});
		}

		createAliasDetailTable(response.body.data);
	});

	Router.get("/:username/alias/list", async (req, res) => {
		const { username } = req.params;
		const { statusCode, body } = await sb.Got("Supinic", {
			url: `bot/user/${encodeURIComponent(username)}/alias/list`,
			throwHttpErrors: false
		});

		if (statusCode !== 200) {
			return res.status(404).render("error", {
				error: statusCode,
				message: body.error.message
			});
		}

		const printData = body.data.map(alias => {
			const created = (alias.created) ? new sb.Date(alias.created) : null;
			const name = (alias.description)
				? `<div class="hoverable" title="${sb.Utils.escapeHTML(alias.description)}">${alias.name}</div>`
				: alias.name;

			return {
				Name: {
					value: `<a href="/bot/user/${username}/alias/detail/${alias.name}">${name}</a>`,
					dataOrder: alias.name
				},
				Invocation: sb.Utils.escapeHTML(`${alias.invocation} ${alias.arguments.join(" ")}`),
				Created: {
					dataOrder: created ?? 0,
					value: (created) ? created.format("Y-m-d") : "N/A"
				}
			};
		});

		res.render("generic-list-table", {
			data: printData,
			head: ["Name", "Invocation", "Created"],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true,
			extraCSS: `
				div.hoverable {
					cursor: pointer;
					text-decoration: underline dotted;
				}
			`
		});
	});

	Router.get("/:username/alias/detail/:alias", async (req, res) => {
		const { alias, username } = req.params;
		const response = await sb.Got("Supinic", {
			url: `bot/user/${encodeURIComponent(username)}/alias/detail/${alias}`,
			throwHttpErrors: false
		});

		if (response.statusCode !== 200) {
			return res.status(404).render("error", {
				error: response.statusCode,
				message: response.body.error.message
			});
		}

		createAliasDetailTable(response.body.data);
	});

	return Router;
})();
