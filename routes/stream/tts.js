/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("data/tts/voices/list").json();
		const renderData = data.map(i => ({
			Name: i.name,
			Language: i.lang,
			Gender: i.gender ?? "N/A",
			Sample: sb.Utils.tag.trim `
				<audio style="height:30px; text-align: center;" controls preload="none">
					<source
						type="audio/mp3"
						src="https://api.streamelements.com/kappa/v2/speech?voice=${i.ID}&text=This+is+a+sample+message."
				    >
				</audio>`
			// Sample: `<a target="_blank" href="https://api.streamelements.com/kappa/v2/speech?voice=${i.ID}&text=This+is+a+sample+message.">Sample</a>`
		}));

		res.render("generic-list-table", {
			data: renderData,
			head: Object.keys(renderData[0]),
			pageLength: 50,
			specificFiltering: true
		});
	});

	return Router;
})();
