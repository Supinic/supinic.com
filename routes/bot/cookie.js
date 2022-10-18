module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "bot/cookie/list").json();
		const printData = data.map(i => ({
			User: i.user,
			Total: i.eaten.daily + i.eaten.received + i.legacy.daily + i.legacy.received,
			Daily: i.eaten.daily + i.legacy.daily,
			Donated: i.donated + i.legacy.donated,
			Received: i.received + i.legacy.received
		}));

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 100
		});
	});

	return Router;
})();
