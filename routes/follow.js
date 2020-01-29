module.exports = (function () {
	const Express = require("express");
	const Router = Express.Router();

	// Twitch follow - verification with challenge
	Router.get("/", (req, res) => {
		// console.log("TWITCH FOLLOW WEBHOOK - GET DATA", req.query, req.body);

		if (req.query["hub.challenge"]) {
			console.log("Responding to challenge!");
			res.send(req.query["hub.challenge"]);
		}

		res.status(200);
		res.end();
	});

	// Twitch follow - new follower
	Router.post("/", (req, res) => {
		// console.log("TWITCH FOLLOW WEBHOOK - POST DATA", req.query, req.body);

		const data = req.body.data[0];
		const params = new sb.URLParams()
			.set("type", "follow")
			.set("date", data.followed_at)
			.set("username", data.from_name);

		sb.InternalRequest.send(params);

		res.status(200);
		res.end();
	});

	return Router;
})();