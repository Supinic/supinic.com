module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your favourites"
			});
		}

		const { data } = await sb.Got.instances.Supinic("track/favourite/list").json();
		const printData = data.filter(i => i.active && i.userAlias === userID).map(i => ({
			Track: `<a href="/track/detail/${i.track}">${i.trackName}</a>`,
			Created: new sb.Date(i.created).format("Y-m-d H:i:s"),
			Edited: (i.lastEdit)
				? new sb.Date(i.created).format("Y-m-d H:i:s")
				: "N/A"
		}));

		res.render("generic-list-table", {
			head: ["Track", "Created", "Edited"],
			data: printData,
			pageLength: 25
		});
	});

	return Router;
})();