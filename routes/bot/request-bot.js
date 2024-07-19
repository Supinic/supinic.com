// noinspection JSUnusedLocalSymbols
const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const getRules = () => {
		let deltaString;
		const date = new sb.Date();
		if (date.getDay() !== 2) {
			const dayOfWeek = (date.getDay() === 0) ? 7 : date.getDay();
			const nextSundayOffset = 7 - dayOfWeek;
			const offset = (nextSundayOffset + 2) % 7; // move from Sunday to Tuesday, in the same week

			date.addDays(offset);
		}
		else if (date.hours >= 20) {
			date.addDays(7);
		}
		else if (date.hours >= 19) {
			deltaString = "I am currently adding Supibot to new channels!";
		}

		if (!deltaString) {
			date.setHours(19);
			deltaString ??= `I will be adding Supibot to new channels in approximately ${sb.Utils.timeDelta(date, true)}.`;
		}

		return sb.Utils.tag.trim `
		    <h6>Rules</h6>
			<ul>
				<li>Only owners and moderators can request Supibot.</li>
				<li>I will not add Supibot to channels that neither stream, nor have an offline chat.</li>
				<li>Supibot has to either (or both):
				 	<ul>
				 		<li>be a moderator in the channel</li>
				 		<li>have the broadcaster's <a href="/bot/twitch-auth">permission via Twitch</a></li>
			        </ul>
				</li>
			</ul>
			
			<h6>Good to know</h6>
			<ul>
				<li>I process bot requests manually, every Tuesday in the evenings, Europe time. ${deltaString}</li> 
				<li id="rename-list-item">If you renamed, you can get Supibot back by whispering the <a href="/bot/command/detail/bot">$bot rename channel:OldChannelName</a> (example: <code>$bot rename channel:old_supinic</code>) command to Supibot.</li>
				<li id="banned-list-item">If you got banned, use the <a href="/bot/command/detail/bot">$bot rejoin channel:ChannelName</a> (example: <code>$bot rejoin channel:supinic</code>).</li>
				<li>If you are lost, check the <a href="/bot/command/detail/help">$help</a> command and the <a href="/data/faq/list">FAQ list</a> first. Then, you can <a href="/contact"> contact me</a> as well.
			</ul>
		`;
	};

	Router.get("/form", async (req, res) => {
		const { userData } = await WebUtils.getUserLevel(req, res);
		if (!userData) {
			return res.render("generic", {
				data: `
					<h5 class="text-center">You must log in before requesting the bot!</h5>
					<hr style="border-top: 1px solid white;">
					${getRules()}
				`
			});
		}

		const response = await sb.Got("Supinic", {
			url: "bot/channel/previousList",
			searchParams: {
				username: userData.Name
			}
		});

		let specialOccassionString = "";
		if (response.statusCode === 200 && response.body.data.length !== 0) {
			const { data } = response.body;
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
					<h6> Whisper the <code>$bot rejoin</code> command to Supibot <a href="/bot/command/detail/bot">(more info here)</a> </h6>
				`;
			}
		}

		const now = sb.Date.now();
		const christmasHolidayEnd = "2024-01-01";
		const isChristmasHoliday = (new sb.Date("2023-12-20") < now && now < new sb.Date("2024-01-01"));

		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Request Supibot</h5>
       			<div id="alert-anchor"></div>
       			${getRules()}
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
					placeholder: "Explain here why you should receive Supibot 😊 English only!"
				}
			],
			script: sb.Utils.tag.trim `
				async function submit () {
					const alerter = document.getElementById("alert-anchor");
					const descriptionElement = document.getElementById("description");	
					if (descriptionElement.value?.toLowerCase().includes("rename")) {
						const listItemElement = document.getElementById("rename-list-item");
						const content = escape(listItemElement.textContent);
						
						window.location.href += "#:~:text=" + content;						
						
						alerter.setAttribute("role", "alert");
						alerter.classList.remove("alert-success", "alert-danger");
						alerter.classList.add("alert", "alert-warning");
						
						alerter.innerHTML = "Please check the 'Keep in mind' category to resolve your renaming issues.";
						
						return;
					}					
					
					const result = confirm("By confirming, you agree that you read and undrestood all notes regarding adding Supibot.");
					if (!result) {
						return;
					}
					
					if (${isChristmasHoliday}) {
						const xmasResult = confirm("Supinic is currently on holiday break. Do you really accept that you are willing to wait up to 3 weeks (up until ${christmasHolidayEnd}) for the bot to be enabled?");
						if (!xmasResult) {
							return;
						}
					}
					
					const button = document.getElementById("submit-button");
					button.disabled = true;
					
					const platformElement = document.getElementById("platform");
					const channelElement = document.getElementById("channel-name");					
					if (channelElement.value?.toLowerCase() !== "${userData.Name}") {
						const result = confirm("Adding Supibot to someone else's channel will automatically make you that channel's Ambassador. Do you agree to take this responsibility?");
						if (!result) {
							return;
						}
					}
					
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
					alerter.setAttribute("role", "alert");
					alerter.classList.remove("alert-success", "alert-danger", "alert-warning");
					alerter.classList.add("alert");
					
					button.disabled = false;
					
					if (response.status === 200) {						
						if (json.data.suggestionID) {
							const ID = json.data.suggestionID;
							const link = "/data/suggestion/" + ID;
							alerter.innerHTML = "Success 🙂<hr>Your suggestion can be found here: <a href=" + link + ">" + ID + "</a>";
						}
						else if (json.data.rename === "success") {
							alerter.innerHTML = "Success 🙂<hr>Rename detected - Supibot automatically joined the new channel.";
						}							
							
						alerter.classList.add("alert-success");
						const formWrapper = document.getElementById("form-wrapper");
						formWrapper.hidden = true;
					}
					else if (response.status === 500) {
						alerter.classList.add("alert-danger");
						alerter.innerHTML = "Internal server error occured!";
					}
					else if (response.status === 409) {						
						alerter.classList.add("alert-danger");
						alerter.innerHTML = json.error.message + ". Create a suggestion with the <a href='/bot/command/detail/suggest'>$suggest</a> command - most easily using <a href='/bot/command/run'>this command form</a>.";
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
