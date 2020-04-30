module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("track/favourite/list").json();
		const printData = data.filter(i => i.active).map(i => ({
			User: i.userName,
			Track: `<a href="/track/detail/${i.track}">${i.trackName}</a>`
		}));

		res.render("generic-list-table", {
			head: ["User", "Track"],
			data: printData,
			pageLength: 25
		});
	});

	return Router;
})();