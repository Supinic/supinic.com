module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const rules = sb.Utils.tag.trim `
		I process bot requests manually, every Tuesday in the evenings (Europe time). 
	
	    <h6>Before requesting</h6>
		<ul>
			<li>You can only request Supibot in your own channel, or if you're a moderator of the channel</li>
			<li>The channel must have at least <b>some</b> activity in it - mostly as a streaming, or a chat-focused channel ("offline chat")</li>
			<li>If your channel doesn't have a lot of activity, use the Description field below to explain why you should receive Supibot</li>
		</ul>
		
		<h6>After requesting</h6>
		<ul>
			<li>Twitch: If you rename or get banned, you can easily get Supibot back by whispering the <code>$bot rejoin</code> command to Supibot <a href="/bot/command/bot">(more info here)</a></li>
			<li>Don't call Supibot "Supi" - this refers to me, Supinic</li>
		</ul>
	`;

	Router.get("/form", async (req, res) => {
		const { userData } = await sb.WebUtils.getUserLevel(req, res);
		if (!userData) {
			return res.render("generic", {
				data: `
					<h5 class="text-center">You must log in before requesting the bot!</h5>
					<hr style="border-top: 1px solid white;">
					${rules}
				`
			});
		}

		const { data } = await sb.Got("Supinic", {
			url: "bot/channel/previousList",
			searchParams: {
				username: userData.Name
			}
		}).json();

		let specialOccassionString = "";
		if (data.length !== 0) {
			const selfChannel = data.find(i => i.name === userData.Name);
			if (selfChannel && selfChannel.mode === "Inactive") {
				specialOccassionString = sb.Utils.tag.trim `
					<h4 class="text-danger"> Supibot has been banned in your channel at some point. </h4>
					<h5> Follow <a href="/data/faq/list?columnQuestion=banned">this FAQ article</a> for more info. </h5>
				`;
			}
			else if (data.every(i => i.mode === "Inactive")) {
				specialOccassionString = sb.Utils.tag.trim `
					<h5 class="text-danger"> You seem to have renamed your channel while having Supibot in it. </h5>
					<h6> Whisper the <code>$bot rejoin</code> command to Supibot <a href="/bot/command/bot">(more info here)</a> </h6>
				`;
			}
		}

		const now = sb.Date.now();
		const isChristmasHoliday = (new sb.Date("2020-12-23") < now && now < new sb.Date("2021-01-04"));

		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Request Supibot</h5>
       			<div id="alert-anchor"></div>
       			${rules}
       			${specialOccassionString}
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
					placeholder: "Short description on why you'd like the bot added 😊 English only!"
				}
			],
			script: sb.Utils.tag.trim `
				async function submit () {
					const result = confirm("By confirming, you agree that you read and undrestood all notes regarding adding Supibot.");
					if (!result) {
						return;
					}
					
					if (${isChristmasHoliday}) {
						const xmasResult = confirm("Supinic is currently on holiday break. Do you really accept that you are willing to wait up to 3 weeks for the bot to be enabled?");
						if (!xmasResult) {
							return;
						}
					}
					
					const button = document.getElementById("submit-button");
					button.disabled = true;
					
					const platformElement = document.getElementById("platform");
					const channelElement = document.getElementById("channel-name");
					const descriptionElement = document.getElementById("description");	
					
					const body = {
						platform: platformElement.value,
						targetChannel: channelElement.value,
						renamedChannel: null,
						description: descriptionElement.value || null
					};	
					
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
						const ID = json.data.suggestionID;
						const link = "/data/suggestion/" + ID;
						alerter.innerHTML = "Success 🙂<hr>Your suggestion can be found here: <a href=" + link + ">" + ID + "</a>";
							
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
