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

		createAliasDetailTable(res, response.body.data);
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

		const auth = await sb.WebUtils.getUserLevel(req, res);
		const headerColumns = (auth.userData && auth.userData.Name !== username.toLowerCase())
			? ["Name", "Invocation", "Created", "Link"]
			: ["Name", "Invocation", "Created"];

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
				},
				Link: `<div alias-owner="${encodeURIComponent(username)}" alias-name="${encodeURIComponent(alias.name)}" class="link-alias active"></div>`
			};
		});

		res.render("generic-list-table", {
			data: printData,
			head: headerColumns,
			headerDescriptions: {
				"Link": "Links the alias to you - as if you used $alias link (user) (alias) with Supibot!"
			},
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true,
			extraScript: `
				function beforeTableInitalize () {
					const unsetList = document.getElementsByClassName("link-alias");
					for (const element of unsetList) {
						if (element.textContent === "OK") {
							continue;
						}
						
						element.classList.add("clickable");
						element.parentElement.addEventListener("click", () => linkAlias(element));
					}
				}
				
				async function linkAlias (element) {
					if (element.classList.contains("loading")) {
						console.log("Aborted requested, previous is still pending");
						return;
					}
					else if (element.classList.contains("inactive")) {
						return;
					}
									
					const aliasName = element.getAttribute("alias-name");
					const aliasOwner = element.getAttribute("alias-owner");
					const approved = confirm("Do you really want to link alias '" + aliasName + "'?");
					if (!approved) {
						return;
					}
					
					const previousContent = element.textContent;
					element.classList.remove("active");
					element.classList.remove("clickable");
					element.classList.add("loading");
					element.textContent = "";
					
					const url = "/api/bot/user/alias/link/" + aliasOwner + "/" + aliasName;
					const { data } = await fetch(url, { method: "GET" })
						.then(i => i.json())
						.catch(i => i.json());
					
					element.classList.remove("loading");
					element.textContent = previousContent;
					
					if (data.statusCode === 403) {
						element.classList.add("active");
						alert("Your session expired! Please log in again.");
					}					
					else if (data.result.success === false) {
						element.classList.add("active");
						alert("🚨 " + data.result.reply);
					}					
					else {
						element.classList.add("inactive");
						element.classList.remove("clickable");
						alert("✔ " + data.result.reply);
					}
				}				 
			`,
			extraCSS: `
				div.clickable {
					cursor: pointer;
				}
				div.link-alias.active { 					
				    background-position: center; 
				    background-repeat: no-repeat;
				    background-size: contain;
			    }
				div.link-alias.active:before { 
					content: "🔗"
			    }
				div.link-alias.inactive:before { 
					content: "OK"
			    }
			    div.link-alias.loading {
			        background-image: url("/public/img/ppCircle.gif");
			    }
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

		createAliasDetailTable(res, response.body.data);
	});

	return Router;
})();
