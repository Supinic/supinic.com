module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const Track = require("../../../modules/track/track.js");

	Router.get("/:id", async (req, res) => {
		const id = Number(req.params.id);
		if (!id) {
			return res.status(400)
				.send(JSON.stringify({
					statusCode: 400,
					error: "ID provided is not a valid positive integer"
				}));
		}

		let trackData = null;
		try {
			trackData = await Track.get(id);
		}
		catch (e) {
			console.error(e);
			return res.status(400)
				.send(JSON.stringify({
					statusCode: 400,
					error: "ID is out of bounds"
				}));
		}

		if (!trackData) {
			return res.status(400)
				.send(JSON.stringify({
					statusCode: 400,
					error: "No data for given ID"
				}));
		}

		res.type("application/json")
			.status(200)
			.send(JSON.stringify({
				statusCode: 200,
				data: sb.Utils.convertCaseObject(trackData, "snake", "camel")
			}));
	});

	return Router;
})();
