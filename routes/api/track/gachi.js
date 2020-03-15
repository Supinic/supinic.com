module.exports = (function () {
	"use strict";
	const Express = require("express");
	const Router = Express.Router();

	const Track = require("../../../modules/track/track.js");

	Router.get("/random", async (req, res) => {
		const track = await Track.selectCustom(rs => rs
			.select("ID")
			.join({
				toDatabase: "music",
				toTable: "Track_Tag",
				on: "Track.ID = Track_Tag.Track"
			})
			.where("Track_Tag.Tag = %n", 6)
			.orderBy("RAND()")
			.limit(1)
			.single()
		);

		const data = await sb.Got.instances.Supinic("track/detail/" + track.ID).json();
		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();