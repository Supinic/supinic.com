/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => {
		const header = ["ID", "User", "Name", "Length", "Status"];
		const { data } = await sb.Got.instances.Supinic("bot/song-request/queue").json();

		const users = await sb.User.getMultiple(data.map(i => i.userAlias));
		const printData = data.map(track => {
			const user = users.find(i => track.userAlias === i.ID);
			return {
				ID: track.vlcID,
				User: user.Name,
				Name: `<a target="_blank" href="${track.parsedLink}">${track.name}</a>`,
				Length: track.length,
				Status: track.status
			};
		});

		res.render("generic-list-table", {
			data: printData,
			head: header,
			pageLength: 25
		});
	});

	return Router;
})();
