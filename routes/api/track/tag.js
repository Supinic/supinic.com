module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const Tag = require("../../../modules/track/tag.js");

	Router.get("/list", async (req, res) => {
		const data = await Tag.list();

		res.type("application/json")
			.status(200)
			.send(JSON.stringify({
				statusCode: 200,
				data
			}));
	});

	Router.get("/:id", async (req, res) => {
		const tagID = Number(req.params.id);
		if (!tagID) {
			return res.type("application/json")
				.status(400)
				.send(JSON.stringify({
					statusCode: 400,
					error: "No tag ID provided"
				}));
		}

		const data = await Tag.get(tagID);
		res.type("application/json")
			.status(200)
			.send(JSON.stringify({
				statusCode: 200,
				data
			}));
	});

	return Router;
})();
