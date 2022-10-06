module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const pretty = (value) => (value === null) ? "N/A" : sb.Utils.groupDigits(value);
	const formatData = (data) => data.map(i => ({
		Place: (i.placeChildren)
			? `<a title="Check subregions" target="_blank" href="/data/corona/region/${i.placeName}/latest">${i.placeName}</a>`
			: i.placeName,
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
		Recoveries: {
			dataOrder: i.allRecoveries,
			value: pretty(i.allRecoveries)
		},
		Tests: {
			dataOrder: i.tests,
			value: pretty(i.tests)
		},
		"Tests/1mil": {
			dataOrder: (i.population && i.tests)
				? (i.tests / i.population) * 1e6
				: 0,
			value: (i.population && i.tests)
				? pretty(Math.trunc((i.tests / i.population) * 1e6))
				: "N/A"
		}
	}));

	Router.get("/global/latest", async (req, res) => {
		const { data } = await sb.Got("Supinic", "data/corona/global/latest").json();
		const printData = formatData(data);

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25,
			sortColumn: 1,
			sortDirection: "desc"
		});
	});

	Router.get("/region/:region/latest", async (req, res) => {
		const { region } = req.params;
		if (!region) {
			res.status(404).render("error", {
				error: "404 Not Found",
				message: "No region provided"
			});
		}

		const { data } = await sb.Got("Supinic", `data/corona/region/${region}/latest`).json();
		if (data.length === 0) {
			res.status(404).render("error", {
				error: "404 Not Found",
				message: "Region has no data to display"
			});
		}

		const printData = formatData(data);
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
