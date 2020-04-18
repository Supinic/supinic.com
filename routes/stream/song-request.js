/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const print = async (data, ...extraFields) => {
		const users = await sb.User.getMultiple(data.map(i => i.userAlias));
		return data.map(track => {
			const user = users.find(i => track.userAlias === i.ID);
			const obj = {
				User: user.Name,
				Name: `<a target="_blank" href="${track.parsedLink}">${track.name}</a>`,
				Length: track.length
			};

			if (extraFields.includes("ID")) {
				obj.ID = track.vlcID;
			}
			if (extraFields.includes("Status")) {
				obj.Status = track.status;
			}
			if (extraFields.includes("Added")) {
				obj.Added = new sb.Date(track.added).format("Y-m-d H:i");
			}

			return obj;
		});
	};

	Router.get("/queue", async (req, res) => {
		const header = ["ID", "User", "Name", "Length", "Status"];
		const { data } = await sb.Got.instances.Supinic("bot/song-request/queue").json();

		res.render("generic-list-table", {
			data: await print(data, "ID", "Status"),
			head: header,
			pageLength: 10
		});
	});

	Router.get("/history", async (req, res) => {
		const header = ["User", "Name", "Length", "Added"];
		const { data } = await sb.Got.instances.Supinic("bot/song-request/history").json();

		res.render("generic-list-table", {
			data: await print(data, "Added"),
			head: header,
			pageLength: 25
		});
	});

	return Router;
})();
