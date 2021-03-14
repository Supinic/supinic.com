/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Channel = require("../../modules/chat-data/channel.js");

	const columns = {
		list: ["ID", "Created", "Sender", "Recipient", "Text", "Scheduled", "Unset"],
		history: ["ID", "Created", "Sender", "Recipient", "Scheduled"],
		lookup: ["ID", "Active", "Created", "Sender", "Recipient", "Text", "Scheduled", "Unset"]
	};

	const formatReminderList = async (req, res, target) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const searchParams = sb.WebUtils.authenticateLocalRequest(userID, null);
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
				error: sb.WebUtils.formatErrorMessage(statusCode),
				message: body.error.message
			});
		}

		const user = res.locals.authUser.login.toLowerCase();
		const sortedData = body.data.sort((a, b) => b.ID - a.ID);

		const data = sortedData.map(i => {
			if (i.author.toLowerCase() === user) {
				i.author = "(You)";
			}
			if (i.target.toLowerCase() === user) {
				i.target = "(You)";
			}

			const created = new sb.Date(i.created);
			const classes = (i.active) ? "active clickable" : "inactive";
			const schedule = (i.schedule) ? new sb.Date(i.schedule) : null;
			return {
				Active: (i.active) ? "Yes" : "No",
				Created: {
					dataOrder: created.valueOf(),
					value: created.format("Y-m-d")
				},
				Sender: i.author,
				Recipient: i.target,
				Text: i.text,
				Scheduled: {
					dataOrder: (schedule) ? schedule.valueOf() : 0,
					value: (schedule)
						? `<div class="hoverable" title="UTC: ${schedule.toUTCString()}">${sb.Utils.timeDelta(schedule)}</div>`
						: "N/A",
				},
				ID: `<a target="_blank" href="/bot/reminder/${i.ID}">${i.ID}</a>`,
				Unset: `<div class="unset-reminder ${classes}"></div>`
			};
		});

		const titleType = (target === "history") ? "inactive" : (target === "lookup") ? "lookup" : "active";
		return res.render("generic-list-table", {
			data,
			title: `Your reminder list - ${titleType}`,
			head: columns[target],
			pageLength: 25,
			sortColumn: 1,
			sortDirection: "desc",
			specificFiltering: true,
			extraCSS: sb.Utils.tag.trim `
				tr.deactivated {
					color: #666 !important;
					text-decoration: line-through !important;
				}
				div.hoverable {
					text-decoration: underline dotted;
				}
				div.clickable {
					cursor: pointer;
				}
				div.unset-reminder.active { 					
				    background-position: center; 
				    background-repeat: no-repeat;
				    background-size: contain;
			    }
				div.unset-reminder.active:before { 
					content: "❌"
			    }
			    div.unset-reminder.inactive:before { 
					content: "N/A"
			    }
			    div.unset-reminder.loading {
			        background-image: url("/public/img/ppCircle.gif");
			    }
			`,
			extraScript: sb.Utils.tag.trim  `
				function beforeTableInitalize () {
					const unsetList = document.getElementsByClassName("unset-reminder");
					for (const element of unsetList) {
						if (element.textContent === "N/A") {
							continue;
						}
						
						element.classList.add("clickable");
						element.parentElement.addEventListener("click", () => unsetReminder(element));
					}
				}
				 				
				async function unsetReminder (element) {
					if (element.classList.contains("loading")) {
						console.log("Aborted requested, previous is still pending");
						return;
					}
					
					const row = element.parentElement.parentElement;
					const ID = Array.from(row.children).find(i => i.getAttribute("field") === "ID").textContent;	
					
					confirm("Do you really want to unset this reminder? (ID " + ID + ")");
					
					const previousContent = element.textContent;
					element.classList.remove("active");
					element.classList.remove("clickable");
					element.classList.add("loading");
					element.textContent = "";
					
					const response = await fetch("/api/bot/reminder/" + ID, { method: "DELETE" })
						.then(i => i.json())
						.catch(i => i.json());
					
					element.classList.remove("loading");
					element.textContent = previousContent;
					
					if (response.statusCode === 403) {
						element.classList.add("active");
						element.classList.add("clickable");
						alert("Your session expired! Please log in again.");
					}
					else if (response.statusCode !== 200) {
						element.classList.add("active");
						element.classList.add("clickable");
						alert("An unknown error occured!");
					}
					else {
						const activeElement = Array.from(row.children).find(i => i.getAttribute("field") === "Active");
						if (activeElement) {
							activeElement.textContent = "No";
						}
						
						row.classList.add("deactivated");
						element.classList.add("inactive");					
						console.log(response.data.message + "!");
					}
				}
			`
		});
	};

	Router.get("/list", async (req, res) => {
		return await formatReminderList(req, res, "list");
	});

	Router.get("/history", async (req, res) => {
		return await formatReminderList(req, res, "history");
	});

	Router.get("/lookup", async (req, res) => {
		return await formatReminderList(req, res, "lookup");
	});

	Router.get("/:id", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your reminders"
			});
		}

		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return res.status(400).render("error", {
				error: sb.WebUtils.formatErrorMessage(400),
				message: "Malformed reminder ID"
			});
		}

		const searchParams = sb.WebUtils.authenticateLocalRequest(userID, null);
		const { statusCode, body } = await sb.Got("Supinic", {
			url: `bot/reminder/${ID}`,
			searchParams: searchParams.toString()
		});

		if (statusCode !== 200) {
			return res.status(statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(statusCode),
				message: body.error.message
			});
		}

		const rawData = body.data;
		const [senderUserData, recipientUserData] = await Promise.all([
			sb.User.get(rawData.userFrom),
			sb.User.get(rawData.userTo),
		]);

		const data = {
			ID: rawData.ID,
			Sender: senderUserData.Name,
			Recipient: recipientUserData.Name,
			"Created in channel": (rawData.channel)
				? (await Channel.getRow(rawData.channel)).values.Name
				: "(created in PMs)",
			Text: rawData.text,
			Pending: (rawData.active) ? "yes" : "no",
			Created: new sb.Date(rawData.created).format("Y-m-d H:i:s"),
			Scheduled: (rawData.schedule)
				? new sb.Date(rawData.schedule).format("Y-m-d H:i:s")
				: "(not scheduled)",
			Private: (rawData.privateMessage) ? "yes" : "no"
		};

		res.render("generic-detail-table", { data });
	});

	return Router;
})();
