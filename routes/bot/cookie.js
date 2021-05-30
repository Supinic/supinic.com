module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", "bot/cookie/list").json();
		const printData = data.map(i => ({
			User: i.user,
			Total: i.total,
			Daily: i.daily,
			Gifted: i.gifted,
			Received: i.received
		}));

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 100
		});
	});

	return Router;
})();
