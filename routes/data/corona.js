module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const pretty = (value) => (value === null) ? "N/A" : sb.Utils.groupDigits(value);
	
	Router.get("/latest", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("/data/corona/latest").json();
		const printData = data.map(i => ({
			Place: i.placeName,
			Cases: {
				dataOrder: i.allCases,
				value: pretty(i.allCases)
			},
			"New cases": {
				dataOrder: i.newCases,
				value: pretty(i.newCases)
			},
			Deaths: {
				dataOrder: i.allDeaths,
				value: pretty(i.allDeaths)
			},
			"New deaths": {
				dataOrder: i.newDeaths,
				value: pretty(i.newDeaths)
			},
			Recoveries:{
				dataOrder: i.allRecoveries,
				value: pretty(i.allRecoveries)
			},
			Tests: {
				dataOrder: i.tests,
				value: pretty(i.tests)
			}
		}));

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25,
			sortColumn: 1,
			sortDirection: "desc"
		});
	});

	return Router;
})();