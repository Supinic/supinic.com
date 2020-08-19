module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Status = require("../../modules/wow/status.js");

	Router.get("/aq-effort/:server", async (req, res) => {
		const { server } = req.params;
		const data = await Status.getAllLatest(server);
		if (data.length === 0) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "No data found for given server"
			});
		}

		const lastUpdate = sb.Utils.timeDelta(data[0].Last_Update);
		const printData = data.map(i => {
			const percent = sb.Utils.round(i.Current / i.Required * 100, 2);
			const normal = i.Material.toLowerCase().replace(/ /g, "-");
			const delta = sb.Utils.groupDigits(i.Delta);
			const timeRemaining = (i.Required === i.Current)
				? "done"
				: sb.Utils.timeDelta(sb.Date.now() + ((i.Required - i.Current) / i.Delta) * 864e5, true);

			return {
				Material: `<a href="/wow/aq-effort/${server}/material/${i.Faction.toLowerCase()}/${normal}">${i.Material}</a>`,
				Faction: i.Faction,
				Current: {
					value: sb.Utils.groupDigits(i.Current),
					dataOrder: i.Current
				},
				Required: {
					value: sb.Utils.groupDigits(i.Required),
					dataOrder: i.Current
				},
				Remaining: {
					value: sb.Utils.groupDigits(i.Required - i.Current),
					dataOrder: (i.Required - i.Current)
				},
				"∆ 24h": {
					value: (i.Delta > 0) ? `+${delta}` : delta,
					dataOrder: i.Delta
				},
				"Time left": {
					value: timeRemaining,
					dataOrder: (i.Required === i.Current)
						? 0
						: ((i.Required - i.Current) / i.Delta) * 864e5
				},
				"%": {
					value: `${sb.Utils.round(percent, 0)}%`,
					dataOrder: percent
				}
			};
		});

		res.render("generic-list-table", {
			title: `AQ War Effort - ${sb.Utils.capitalize(server)}`,
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 50,
			sortColumn: 4,
			sortDirection: "desc",
			extraScript: `
				window.onload = () => {
					const navbar = document.getElementById("table_wrapper").previousSibling;
					navbar.insertAdjacentHTML("afterend", \`
						<div class="last-update text-center pt-2">
							<h5>Last update: ${lastUpdate}</h5>
						</div>\`
					);
				};			
			`
		});
	});

	Router.get("/aq-effort/:server/material/:faction/:material", async (req, res) => {
		let { server, faction, material } = req.params;
		server = server.replace(/-/g, " ").split(" ").map(i => sb.Utils.capitalize(i)).join(" ");
		material = material.replace(/-/g, " ").split(" ").map(i => sb.Utils.capitalize(i)).join(" ");
		faction = sb.Utils.capitalize(faction);

		const materialData = await Status.getMaterialDetail({ faction, material });
		const historyData = await Status.getMaterialHistory({ faction, material, server });
		if (historyData.length === 0) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "No data found for given material/faction/server combination"
			});
		}

		const labels = [];
		const data = [];
		for (const historyItem of historyData) {
			labels.push(historyItem.Updated.format("D j.n. H:i"));
			data.push(historyItem.Amount);
		}

		res.render("generic-chart", {
			title: `AQ War Effort - ${sb.Utils.capitalize(server)} - ${material}`,
			chart: {
				title: `${material} (${faction})`,
				xAxis: {
					name: "",
					labels: JSON.stringify(labels)
				},
				yAxis: {
					name: "",
					min: 0,
					max: materialData.Required
				},
				dataName: "Material",
				data: JSON.stringify(data)
			}
		});
	});

	return Router;
})();