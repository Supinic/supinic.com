/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const ExtraUserData = require("../../modules/chat-data/extra-user-data.js");

	Router.get("/list", async (req, res) => {
		const rawData = await ExtraUserData.list();
		const data = rawData.map(i => {
			const total = i.Cookies_Total + i.Cookie_Gifts_Received - i.Cookie_Gifts_Sent + i.Cookie_Today;
			const daily = i.Cookies_Total - i.Cookie_Gifts_Sent;
			return {
				User: i.Name,
				Total: (total < 0) ? 0 : total,
				Daily: (daily < 0) ? 0 : daily,
				Gifted: i.Cookie_Gifts_Sent,
				Received: i.Cookie_Gifts_Received
			};
		});

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 100
		});
	});

	return Router;
})();
