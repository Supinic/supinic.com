/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const rules = sb.Utils.tag.trim `
	    <h6>Rules</h6>
		<ol>
			<li>You can only request Supibot in your own channel or someone else's channel if you are a moderator there.</li>
			<li>Your Twitch channel must not be in follower-only, subscriber-only, or any other mode that prevents people from chatting. If it is, the suggestion will be dropped. Watch out!</li>
			<li>Make sure to not accidentally ban the bot - because when it does, it will automatically leave your channel and will not come back on its own. You can mostly prevent this by modding it - it doesn't do any moderation on its own, and it's generally safe to do so.</li>
			<li>If you change your name (outside of changing lower- and uppercase characters), Supibot will not track your namechange and you must request the bot again.</li>
			<li>Please refer to Supibot as "the bot" or "Supibot", not as "Supi". "Supi" refers to me (Supinic), and it gets very confusing sometimes 😃</li>
		</ol>
		<h6>Warning</h6>
		<div>The bot will not be added immediately! I evaluate the requests manually. It usually happens within one to seven days from the request.</div>
		<br>
		<h6>Rename</h6>
		<div>If you changed your name, request the bot again, but this time, check the Rename checkbox, and fill in your previous channel name. You can leave the description blank. Supibot should immediately join your renamed channel if it can verify that it is still you.</div>
		<br>
	`;

	Router.get("/form", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.render("generic", {
				data: `
					<h5 class="text-center">You must log in before requesting the bot!</h5>
					<hr style="border-top: 1px solid white;">
					${rules}
				`
			});
		}

		const now = sb.Date.now();
		const isChristmasHoliday = (new sb.Date("2020-12-23") < now && now < new sb.Date("2021-01-04"));

		const userData = await sb.User.get(userID ?? 1);
		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Request Supibot in a Twitch channel</h5>
       			<div id="alert-anchor"></div>
       			${rules}
			`,
			onSubmit: "submit()",
			fields: [
				{
					id: "platform",
					name: "Platform",
					type: "select",
					value: "twitch",
					options: [
						{ value: "cytube", text: "Cytube" },
						{ value: "twitch", text: "Twitch" }
					]
				},
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
				},
				{
					id: "rename",
					name: "Rename",
					type: "checkbox"
				}
			],
			script: sb.Utils.tag.trim `
				let renameMode = false;	
				window.onload = async () => {
					const checkbox = document.getElementById("rename");
					const platform = document.getElementById("platform");
					const descriptionMemo = document.getElementById("description");
					const rename = document.getElementById("rename");
					const descriptionPlaceholder = descriptionMemo.placeholder;
					const channelLabel = document.querySelector("[for='Channel name']");
					
					platform.addEventListener("change", () => {
						if (platform.value === "cytube") {
							rename.parentElement.style.display = "none";
						}
						else {
							rename.parentElement.style.display = "initial";
						}
					});
					
					checkbox.addEventListener("click", () => {
						renameMode = !renameMode;
						if (renameMode) {
							descriptionMemo.disabled = true;
							descriptionMemo.placeholder = "";
							channelLabel.innerText = "Previous channel name";
						}
						else {							
							descriptionMemo.disabled = false;
							descriptionMemo.placeholder = descriptionPlaceholder;
							channelLabel.innerText = "Channel name";
						}
					});
				};

				async function submit (element) {
					if (renameMode === false) {
						const result = confirm("By proceeding, you accept the rules and agree to conform by them.");
						if (!result) {
							return;
						}
						
						if (${isChristmasHoliday}) {
							const xmasResult = confirm("Supinic is currently on holiday break. Do you really accept that you are willing to wait up to 3 weeks for the bot to be enabled?");
							if (!xmasResult) {
								return;
							}
						}
					}
					
					const button = document.getElementById("submit-button");
					button.disabled = true;
					
					const platformElement = document.getElementById("platform");
					const channelElement = document.getElementById("channel-name");
					const descriptionElement = document.getElementById("description");	
					const renameElement = document.getElementById("rename");
					
					let body;
					if (renameMode === true) {
						body = {
							platform: platformElement.value,
							renamedChannel: channelElement.value,
							targetChannel: null,
							description: null
						};
					}
					else {
						body = {
							platform: platformElement.value,
							targetChannel: channelElement.value,
							renamedChannel: null,
							description: descriptionElement.value || null
						};
					}				
					
					const response = await fetch("/api/bot/request-bot/", {
						method: "POST",
						headers: {
						    "Content-Type": "application/json"
						},
						body: JSON.stringify(body)
					});
					
					const json = await response.json();
					const alerter = document.getElementById("alert-anchor");
					alerter.setAttribute("role", "alert");
					alerter.classList.remove("alert-success", "alert-danger");
					alerter.classList.add("alert");
					
					button.disabled = false;
					
					if (response.status === 200) {
						if (renameElement.value === true) {
							alerter.innerHTML = "Success 🙂<hr>Bot has been added to your current channel, and removed from the old one.";							
						}
						else {							
							const ID = json.data.suggestionID;
							const link = "/data/suggestion/" + ID;
							alerter.innerHTML = "Success 🙂<hr>Your suggestion can be found here: <a href=" + link + ">" + ID + "</a>";
						}
							
						alerter.classList.add("alert-success");
						const formWrapper = document.getElementById("form-wrapper");
						formWrapper.hidden = true;
					}
					else if (response.status === 500) {
						alerter.classList.add("alert-danger");
						alerter.innerHTML = "Internal server error occured!";
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
