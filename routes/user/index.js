module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const UserAlias = require("../../modules/chat-data/user-alias.js");

	const routes = [];
	for (const [name, link] of routes) {
		Router.use("/" + name, require("./" + link))
	}

	Router.use("/", async (req, res, next) => {
		if (!res.locals.authUser) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: `You must be logged in to access this page`
			});
		}

		next();
	});

	Router.get("/alias/list", async (req, res) => {
		const userData = await UserAlias.getRow(res.locals.authUser.userData.ID);
		const aliases = (userData.values.Data)
			? JSON.parse(userData.values.Data).aliasedCommands
			: {};

		const printData = Object.values(aliases).map(alias => ({
			Name: alias.name,
			Invocation: alias.invocation + " " + alias.args.join(" "),
			Created: (alias.created)
				? new sb.Date(alias.created).format("Y-m-d H:i")
				: "N/A",
			Edited: (alias.lastEdit)
				? new sb.Date(alias.lastEdit).format("Y-m-d H:i")
				: "N/A"
		}));

		res.render("generic-list-table", {
			data: printData,
			head: ["Name", "Invocation", "Created", "Edited"],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	return Router;
})();