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
			specificFiltering: true,
			extraCSS: `div.MEGADANK { text-align: center } `,
			extraScript: `
				window.onload = () => {
					const navbar = document.getElementById("table_wrapper").previousSibling;
					navbar.insertAdjacentHTML("afterend", \`
						<div class="MEGADANK">
							<h5>Supibot does not support channel-points TTS!</h5>
							<h5>This is just a voice list! Contact <a href="//twitch.tv/icdb">@icdb</a> for the TTS bot.</h5>
						</div>\`
					);
				};			
			`
		});
	});

	return Router;
})();
