module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/asset/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "crypto-game/asset/list").json();

		const baseline = data.find(i => i.baseline);
		const priceColumn = `Price (${baseline.code})`;
		const printData = data.map(i => ({
			Code: (i.baseline)
				? `${i.code} (baseline)`
				: i.code,
			Name: i.name ?? "N/A",
			Type: i.type ?? "N/A",
			[priceColumn]: {
				dataOrder: i.price ?? 0,
				value: (i.price !== null)
					? `${sb.Utils.round(i.price, 9, { direction: "floor" }).toFixed(9)}`
					: "N/A"
			}
		}));

		res.render("generic-list-table", {
			title: "Crypto-game asset price list",
			data: printData,
			head: Object.keys(printData[0]),
			specificFiltering: true,
			pageLength: 50
		});
	});

	Router.get("/portfolio/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "crypto-game/portfolio/list").json();
		const printData = data
			.sort((a, b) => b.convertedTotal - a.convertedTotal)
			.map((i, index) => {
				const created = new sb.Date(i.created);
				return {
					Rank: index + 1,
					Owner: (i.ownerName),
					Total: `€ ${sb.Utils.round(i.convertedTotal, 3)}`,
					Created: {
						value: created.format("Y-m-d"),
						dataOrder: created.valueOf()
					}
				};
			});

		res.render("generic-list-table", {
			title: "Crypto-game portfolio list",
			data: printData,
			head: Object.keys(printData[0]),
			specificFiltering: true,
			pageLength: 50
		});
	});

	return Router;
})();
