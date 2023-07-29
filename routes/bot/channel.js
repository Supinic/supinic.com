const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	Router.get("/list", async (req, res) => {
		const { data: rawData } = await sb.Got("Supinic", "bot/channel/list").json();

		// Use all non-Discord channels, and only show Discord channels with a description
		// Those who aren't are most likely inactive.
		const data = rawData.filter(i => i.platformName !== "Discord" || i.description).map(i => ({
			Name: (i.platformName === "Discord")
				? (i.description ?? "(unnamed discord channel)")
				: i.name,
			Mode: i.mode,
			Platform: i.platformName,
			Lines: {
				dataOrder: i.lineCount ?? 0,
				value: (i.lineCount)
					? sb.Utils.groupDigits(i.lineCount)
					: "N/A"
			},
			"Logs size": {
				dataOrder: i.byteLength ?? 0,
				value: (i.byteLength)
					? sb.Utils.formatByteSize(i.byteLength)
					: "N/A"
			},
			ID: `<a href="/bot/channel/detail/${i.ID}">${i.ID}</a>`
		}));

		res.render("generic-list-table", {
			title: "Channel list - Supibot",
			data,
			head: Object.keys(data[0]),
			pageLength: 50,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true,
			extraCSS: `				
				th[aria-label^="Logs size"] {
					white-space: nowrap;
				}
				th[aria-label^="Lines"] {
					white-space: nowrap;				
				} 
			`
		});
	});

	Router.get("/:id", async (req, res) => {
		res.redirect(`/bot/channel/detail/${req.params.id}`);
	});

	Router.get("/detail/:id", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "400 Bad Request",
				message: "Channel ID is not valid"
			});
		}

		const { data } = await sb.Got("Supinic", `bot/channel/detail/${channelID}`).json();

		const ambassadorsBody = data.ambassadorList.map(i => `<li>${i.name}</li>`).join("");
		const ambassadorsHTML = (data.ambassadorList.length === 0)
			? `No ambassadors`
			: `<ul>${ambassadorsBody}</ul>`;

		const renderData = {
			ID: data.ID,
			Name: data.name,
			Platform: data.platform,
			"Platform ID": data.platformID,
			"Bot mode": data.botMode,
			"Banphrase API URL": data.banphraseURL ?? "N/A",
			Description: data.description ?? "N/A",
			Ambassadors: ambassadorsHTML,
			Filters: `<a href="/bot/channel/detail/${data.ID}/filter/list">List of filters</a>`
		};

		res.render("generic-detail-table", {
			title: `Detail - Channel ${data.ID} - Supibot`,
			data: renderData
		});
	});

	Router.get("/detail/:id/filter/list", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Target channel has no filter data"
			});
		}

		const { data } = await sb.Got("Supinic", `bot/filter/channel/${channelID}/list`).json();
		const printData = data.map(i => ({
			ID: i.ID,
			User: i.userName ?? "(all)",
			Command: i.commandName ?? "(all)",
			Created: new sb.Date(i.created).format("Y-m-d H:i"),
			Issuer: i.issuerName
		}));

		res.render("generic-list-table", {
			title: `Filters - Channel ${channelID} - Supibot`,
			data: printData,
			head: ["ID", "User", "Command", "Created", "Issuer"],
			pageLength: 10
		});
	});

	Router.get("/detail/:id/alias/list", async (req, res) => {
		const channelID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(channelID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Target channel has no filter data"
			});
		}

		const response = await sb.Got("Supinic", `bot/channel/detail/${channelID}/alias/list`);
		if (response.statusCode !== 200) {
			return WebUtils.handleError(res, response.statusCode, response.body.error?.message);
		}

		const headerColumns = ["Name", "Invocation", "Created"];
		const printData = response.body.data.map(alias => {
			const created = (alias.created) ? new sb.Date(alias.created) : null;
			const link = `<a href="/bot/user/${encodeURIComponent(alias.linkAuthor)}/alias/detail/${encodeURIComponent(alias.linkName)}">🔗 ${alias.name}</a>`;
			const invocation = (alias.linkName && alias.linkAuthor)
				? `<code>(link to alias ${alias.linkName} made by ${alias.linkAuthor})</code>`
				: `<code>(deleted alias)</code>`;

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
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	return Router;
})();
