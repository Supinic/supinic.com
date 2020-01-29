module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/:id", (req, res) => {
		console.log(req, res);

		if (req.params.id === "lol") {
			const params = new sb.URLParams()
				.set("type", "debug")
				.set("data", Math.random());

			sb.InternalRequest.send(params);
		}

		res.set("Content-Type", "text/html");
		res.send("OK");
	});

	return Router;
})();
