/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("data/tts/google/list").json();
		const renderData = data.map(i => ({
			Language: i.language,
			Locale: i.locale,
			Code: i.code,
			Sample: sb.Utils.tag.trim `
				<audio style="height:30px; text-align: center;" controls preload="none">
					<source
						type="audio/mp3"
						src="http://translate.google.com/translate_tts?ie=UTF-8&total=1&idx=0&client=tw-ob&prev=input&ttsspeed=1&q=This+is+a+sample+message&textlen=24&tl=${i.locale}"
				    >
				</audio>`
		}));

		res.render("generic-list-table", {
			data: renderData,
			head: Object.keys(renderData[0]),
			pageLength: 50,
			specificFiltering: true
		});
	});

	Router.get("/streamelements/list", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("data/tts/streamelements/list").json();
		const renderData = data.map(i => ({
			Name: i.name,
			Language: i.lang,
			Gender: i.gender ?? "N/A",
			Sample: sb.Utils.tag.trim `
				<audio style="height:30px; text-align: center;" controls preload="none">
					<source
						type="audio/mp3"
						src="https://api.streamelements.com/kappa/v2/speech/?voice=${i.ID}&text=This+is+a+sample+message."
				    >
				</audio>`
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
							<h6>This list is no longer in use.</h6>
						</div>\`
					);
				};			
			`
		});
	});

	return Router;
})();
