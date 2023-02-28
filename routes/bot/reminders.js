const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const columns = {
		list: ["ID", "Created", "Sender", "Recipient", "Text", "Scheduled", "Unset"],
		history: ["ID", "Created", "Sender", "Recipient", "Text", "Scheduled"],
		lookup: ["ID", "Active", "Created", "Sender", "Recipient", "Text", "Scheduled", "Unset"]
	};

	const formatReminderList = async (req, res, target) => {
		const { userID } = await WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const searchParams = WebUtils.authenticateLocalRequest(userID);
		if (target === "lookup") {
			const ID = (req.query.ID ?? "");
			searchParams.set("ID", ID);
		}

		const { statusCode, body } = await sb.Got("Supinic", {
			url: `bot/reminder/${target}`,
			searchParams: searchParams.toString(),
			throwHttpErrors: false
		});

		if (statusCode !== 200) {
			return res.status(statusCode).render("error", {
				error: WebUtils.formatErrorMessage(statusCode),
				message: body.error.message
			});
		}

		const user = res.locals.authUser.login.toLowerCase();
		const sortedData = body.data.sort((a, b) => b.ID - a.ID);

		const data = sortedData.map(i => {
			let cancelled = "N/A";
			if (i.cancelled === true) {
				cancelled = "✔";
			}
			else if (i.cancelled === false) {
				cancelled = "❌";
			}

			if (i.author.toLowerCase() === user) {
				i.author = "(You)";
			}
			if (i.target.toLowerCase() === user) {
				i.target = "(You)";
			}

			const created = new sb.Date(i.created);
			const classes = (i.active) ? "hasText" : "disabled";
			const schedule = (i.schedule) ? new sb.Date(i.schedule) : null;
			return {
				Active: (i.active) ? "Yes" : "No",
				Created: {
					dataOrder: created.valueOf(),
					value: `<div class="hoverable" title="UTC: ${created.toUTCString()}">${sb.Utils.timeDelta(created)}</div>`
				},
				Sender: i.author,
				Recipient: i.target,
				Text: WebUtils.linkify(i.text, {
					rel: "noopener noreferrer",
					target: "_blank",
					replacement: "(empty)"
				}),
				Scheduled: {
					dataOrder: (schedule) ? schedule.valueOf() : 0,
					value: (schedule)
						? `<div class="hoverable" title="UTC: ${schedule.toUTCString()}">${sb.Utils.timeDelta(schedule)}</div>`
						: "N/A"
				},
				Private: (i.privateMessage) ? "Yes" : "No",
				Cancelled: cancelled,
				ID: `<a target="_blank" href="/bot/reminder/${i.ID}">${i.ID}</a>`,
				Unset: `
					<a class="unset-reminder btn btn-warning ${classes}" role="button" aria-controls>
						<div class="spinner-border spinner-border-sm inactive" role="status" aria-hidden="true">
						</div>
					</a>
				`
			};
		});

		const titleType = (target === "history") ? "inactive" : ((target === "lookup") ? "lookup" : "active");
		return res.render("generic-list-table", {
			data,
			title: `Your reminder list - ${titleType}`,
			head: columns[target],
			pageLength: 25,
			sortColumn: 1,
			sortDirection: "desc",
			specificFiltering: true,
			extraCSS: sb.Utils.tag.trim `
				a.btn {
					margin: 3px;
				}
				tr.deactivated {
					color: #666 !important;
					text-decoration: line-through !important;
				}
				div.hoverable {
					text-decoration: underline dotted;
				}
				a.unset-reminder.hasText:before { 
					content: "❌"
			    }
			    div.spinner-border.active {
			        display: inherit;
			    }
			    div.spinner-border.inactive {
			        display: none;
			    }
			    td > a.linkified {
					display: inline-block;
			    }
			    th[aria-label^="ID"] {
					min-width: 30px;
				}
			`,
			extraScript: sb.Utils.tag.trim `
				function beforeTableInitalize () {
					const unsetList = document.getElementsByClassName("unset-reminder");
					for (const element of unsetList) {
						if (element.textContent === "N/A") {
							continue;
						}
						
						element.addEventListener("click", () => unsetReminder(element));
					}
				}
				 				
				async function unsetReminder (element) {
					if (element.classList.contains("loading")) {
						console.log("Aborted requested, previous is still pending");
						return;
					}
					
					const row = element.parentElement.parentElement;
					const ID = Array.from(row.children).find(i => i.getAttribute("field") === "ID").textContent;	
					
					const approved = confirm("Do you really want to unset this reminder? (ID " + ID + ")");
					if (!approved) {
						return;
					}
					
					const spinner = element.firstElementChild;
					spinner.classList.remove("inactive");
					spinner.classList.add("active");
					element.classList.remove("hasText");
					
					const response = await fetch("/api/bot/reminder/" + ID, { method: "DELETE" })
						.then(i => i.json())
						.catch(i => i.json());
					
					spinner.classList.add("inactive");
					spinner.classList.remove("active");
					element.classList.add("hasText");
					
					if (response.statusCode === 403) {
						alert("Your session expired! Please log in again.");
					}
					else if (response.statusCode !== 200) {
						alert("An unknown error occured! Please contact @Supinic");
					}
					else {
						const activeElement = Array.from(row.children).find(i => i.getAttribute("field") === "Active");
						if (activeElement) {
							activeElement.textContent = "No";
						}
						
						row.classList.add("deactivated");
						element.classList.add("disabled");
						console.log(response.data.message + "!");
					}
				}
			`
		});
	};

	Router.get("/list", async (req, res) => await formatReminderList(req, res, "list"));

	Router.get("/history", async (req, res) => await formatReminderList(req, res, "history"));

	Router.get("/lookup", async (req, res) => await formatReminderList(req, res, "lookup"));

	Router.get("/:id", async (req, res) => {
		const { userID } = await WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return res.status(400).render("error", {
				error: WebUtils.formatErrorMessage(400),
				message: "Malformed reminder ID"
			});
		}

		const searchParams = WebUtils.authenticateLocalRequest(userID, null);
		const { statusCode, body } = await sb.Got("Supinic", {
			url: `bot/reminder/${ID}`,
			searchParams: searchParams.toString()
		});

		if (statusCode !== 200) {
			return res.status(statusCode).render("error", {
				error: WebUtils.formatErrorMessage(statusCode),
				message: body.error.message
			});
		}

		const data = body.data;
		const printData = {
			ID: data.ID,
			Sender: data.sender,
			Recipient: data.recipient,
			"Created in channel": data.channel,
			Type: data.type,
			Text: WebUtils.linkify(data.text, {
				rel: "noopener noreferrer",
				target: "_blank"
			}),
			Pending: (data.active) ? "✔" : "❌",
			Created: new sb.Date(data.created).format("Y-m-d H:i:s"),
			Scheduled: (data.schedule)
				? new sb.Date(data.schedule).format("Y-m-d H:i:s")
				: "(not scheduled)",
			Private: (data.privateMessage) ? "✔" : "❌"
		};

		res.render("generic-detail-table", { data: printData });
	});

	return Router;
})();
