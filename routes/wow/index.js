module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Status = require("../../modules/wow/status.js");

	Router.get("/aq-effort/:serverName", async (req, res) => {
		const server = req.params.serverName;
		const data = await Status.getAllLatest(server);
		if (data.length === 0) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "No data found for given server"
			});
		}

		const printData = data.map(i => {
			const percent = sb.Utils.round(i.Current / i.Required * 100, 2);
			return {
				Material: i.Material,
				Faction: i.Faction,
				Current: i.Current,
				Required: i.Required,
				"24h change": i.Delta,
				"%": {
					value: `${percent}%`,
					dataOrder: percent
				},
				Updated: {
					value: sb.Utils.timeDelta(i.Last_Update),
					dataOrder: i.Last_Update.valueOf()
				}
			};
		});

		res.render("generic-list-table", {
			title: `AQ War Effort - ${sb.Utils.capitalize(server)}`,
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 50,
			sortColumn: 5,
			sortDirection: "desc"
		});
	});

	return Router;
})();