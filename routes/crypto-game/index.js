module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/asset/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "crypto-game/asset/list").json();
		const printData = data.map(i => ({
			Code: (i.baseline)
				? `<b>${i.code}</b>`
				: i.code,
			Name: i.name ?? "N/A",
			Type: i.type ?? "N/A",
			Price: (i.price !== null)
				? i.price.toFixed(9)
				: "N/A"
		}));

		res.render("generic-list-table", {
			title: "Crypto-game asset price list",
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 50
		});
	});

	return Router;
})();