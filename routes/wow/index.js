module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Status = require("../../modules/wow/status.js");

	Router.get("/server/:serverName", async (req, res) => {
		const server = req.params.serverName;
		const data = await Status.getAllLatest(server);
		if (data.length === 0) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "No data for given server has been found"
			});
		}

		res.render("generic-list-table", {
			data,
			head: Object.keys(data[0]),
			pageLength: 50,
			sortColumn: 1,
			sortDirection: "desc"
		});
	});

	return Router;
})();