/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/form", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before requesting the bot"
			});
		}

		const userData = await sb.User.get(userID ?? 1);
		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Request Supibot in a Twitch channel</h5>
       			<div id="alert-anchor"></div>
       			<h6>Rules</h6>
				<ul>
					<li>You can only request Supibot in your own channel or someone else's channel if you are a moderator there.</li>
					<li>Make sure to not accidentally ban the bot - because when it does, it will automatically leave your channel and will not come back on its own. You can 100% prevent this by modding it - it doesn't do any moderation, and it's safe to do so.</li>
					<li>If you change your name (outside of changing lower- and uppercase characters), Supibot will not track your namechange and you must request the bot again. If this is the case, you also must add your previous name to the request.</li>
					<li>Please refer to Supibot as "the bot" or "Supibot", not as "Supi". "Supi" refers to me (Supinic), and it gets very confusing sometimes 😃</li>
				</ul>
			`,
			onSubmit: "submit()",
			fields: [
				{
					id: "channel-name",
					name: "Channel name",
					type: "string",
					value: userData.Name
				},
				{
					id: "description",
					name: "Description",
					type: "memo",
					placeholder: "Short description on why you'd like the bot added 😊"
				}
			],
			script: sb.Utils.tag.trim `
				async function submit (element) {
					const channelElement = document.getElementById("channel-name");
					const descriptionElement = document.getElementById("description");	
					const response = await fetch("/api/bot/request-bot/", {
						method: "POST",
						headers: {
						    "Content-Type": "application/json"
						},
						body: JSON.stringify({
							targetChannel: channelElement.value,
							description: descriptionElement.value || null
						})
					});
					
					const json = await response.json();
					const alerter = document.getElementById("alert-anchor");
					alerter.setAttribute("role", "alert");
					alerter.classList.remove("alert-success", "alert-danger");
					alerter.classList.add("alert");
					
					if (response.status === 200) {
						const ID = json.data.suggestionID;
						const link = "/data/suggestion/" + ID;
						alerter.innerHTML = "Success 🙂<hr>Your suggestion can be found here: <a href=" + link + ">" + ID + "</a>"; 
						alerter.classList.add("alert-success");
						
						const formWrapper = document.getElementById("form-wrapper");
						formWrapper.hidden = true;
					}
					else {
						alerter.classList.add("alert-danger");
						alerter.innerHTML = json.error.message;
					}
				}
			`
		});
	});

	return Router;
})();
