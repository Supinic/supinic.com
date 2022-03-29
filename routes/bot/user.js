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
				message: response.body.error?.message ?? "N/A"
			});
		}

		createAliasDetailTable(res, response.body.data);
	});

	Router.get("/:username/alias/list", async (req, res) => {
		const { username } = req.params;
		const { statusCode, body } = await sb.Got("Supinic", {
			url: `bot/user/${encodeURIComponent(username)}/alias/list`,
			searchParams: {
				includeArguments: "true"
			},
			throwHttpErrors: false
		});

		if (statusCode !== 200) {
			return res.status(404).render("error", {
				error: statusCode,
				message: body.error.message
			});
		}

		const auth = await sb.WebUtils.getUserLevel(req, res);
		let headerColumns;
		if (auth.userData) {
			if (auth.userData.Name === username.toLowerCase()) {
				headerColumns = ["Name", "Invocation", "Created", "Unset"];
			}
			else {
				headerColumns = ["Name", "Invocation", "Created", "Link"];
			}
		}
		else {
			headerColumns = ["Name", "Invocation", "Created"];
		}

		const printData = body.data.map(alias => {
			const created = (alias.created) ? new sb.Date(alias.created) : null;
			const name = (alias.description)
				? `<div class="hoverable" title="${sb.Utils.escapeHTML(alias.description)}">${alias.name}</div>`
				: alias.name;

			const link = (alias.linkAuthor && alias.linkName)
				? `<a href="/bot/user/${encodeURIComponent(alias.linkAuthor)}/alias/detail/${encodeURIComponent(alias.linkName)}">🔗 ${alias.name}</a>`
				: `<a href="/bot/user/${username}/alias/detail/${alias.name}">${name}</a>`;

			const invocation = (alias.linkAuthor && alias.linkName)
				? `<code>(link to alias ${alias.linkName} made by ${alias.linkAuthor})</code>`
				: sb.Utils.escapeHTML(`${alias.invocation} ${alias.arguments.join(" ")}`);

			return {
				Name: {
					value: link,
					dataOrder: alias.name
				},
				Invocation: invocation,
				Created: {
					dataOrder: created ?? 0,
					value: (created) ? created.format("Y-m-d") : "N/A"
				},
				Link: `<div alias-owner="${username}" alias-name="${alias.name}" class="link-alias active"></div>`,
				Unset: `
					<a class="delete-alias btn btn-warning" role="button" alias-name="${alias.name}" aria-controls>
						<div class="spinner-border spinner-border-sm inactive" role="status" aria-hidden="true">
						</div>
					</a>
				`
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
					
					const deleteList = document.getElementsByClassName("delete-alias");
					for (const element of deleteList) {						
						element.classList.add("clickable");
						element.addEventListener("click", () => deleteAlias(element));
					}
				}
				
				async function deleteAlias (element) {
					const aliasName = element.getAttribute("alias-name");
					if (!aliasName) {
						return;
					}
					
					const approved = confirm("Do you really want to remove the " + aliasName + " alias?");
					if (!approved) {
						return;
					}
					
					const spinner = element.firstElementChild;
					spinner.classList.remove("inactive");
					spinner.classList.add("active");
					
					const response = await fetch("/api/bot/command/run", {
						method: "POST",
						headers: {
							"Content-Type": "application/json"
						},
						body: JSON.stringify({
							query: "$alias remove " + aliasName
						})
					});
					const { data } = await response.json();
					
					spinner.classList.add("inactive");
					spinner.classList.remove("active");
					
					if (response.status === 403) {
						alert("Your session expired! Please log in again.");
					}
					else if (data.success === false) {
						alert("🚨 " + data.reply);
					}					
					else {
						const row = element.parentElement.parentElement;
						
						row.classList.add("deactivated");
						element.classList.add("disabled");
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
					
					const url = "/api/bot/user/alias/link/" + encodeURIComponent(aliasOwner) + "/" + encodeURIComponent(aliasName);
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
				
				a.btn {
					margin: 3px;
				}
				tr.deactivated {
					color: #666 !important;
					text-decoration: line-through !important;
				}				
				tr.deactivated a {
					color: #666 !important;
					cursor: default;
                    pointer-events: none;
				}
				a.delete-alias:before { 
					content: "❌"
			    }
			    div.spinner-border.active {
			        display: inherit;
			    }
			    div.spinner-border.inactive {
			        display: none;
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
				message: response.body.error?.message ?? "N/A"
			});
		}

		const { data } = response.body;
		if (data.linkAuthor && data.linkAlias) {
			res.redirect(`bot/user/${encodeURIComponent(data.linkAuthor)}/alias/detail/${data.linkAlias}`);
		}
		else {
			createAliasDetailTable(res, response.body.data);
		}
	});

	return Router;
})();
