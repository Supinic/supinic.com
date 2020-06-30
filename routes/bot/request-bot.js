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
