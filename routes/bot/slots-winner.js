/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const SlotsWinner = require("../../modules/data/slots-winner.js");

	Router.get("/list", async (req, res) => {
		const data = (await SlotsWinner.list()).map(i => ({
			"Odds - 1:X" : sb.Utils.round(i.Odds, 3),
			User: i.User_Name,
			Channel: i.Channel_Name,
			Roll: [
				`<div title="Input: ${i.Source.replace(/"/g, `&ldquo;`)}" style="cursor: pointer; text-decoration: underline;">List of words</div>`,
				`<div title="Winning roll: ${i.Result.replace(/"/g, `&ldquo;`)}" style="cursor: pointer; text-decoration: underline;">Winning roll</div>`
			].join(""),
			Date: new sb.Date(i.Timestamp).format("Y-m-d H:i:s")
		}));

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 25
		});
	});

	return Router;
})();
