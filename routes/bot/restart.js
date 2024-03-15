const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");
const config = require("../../restart-user-list.json");
const ALLOWED_USERS = config.users;

module.exports = (function () {
	"use strict";

	Router.get("/", async (req, res) => {
		const auth = await WebUtils.getUserLevel(req, res);
		if (!auth.userData) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before attempting this"
			});
		}
		else if (!ALLOWED_USERS.includes(auth.userData.ID)) {
			return res.status(403).render("error", {
				error: "403 Forbidden",
				message: "You do not have access to this functionality"
			});
		}

		const script = sb.Utils.tag.trim `			
			async function execute () {
				if (!confirm("Really do it?")) {
					return;
				}

				const response = await fetch("/bot/restart", { method: "POST" });
				const alerter = document.getElementById("alert-anchor");	
				if (response.status === 200) {
					alerter.setAttribute("role", "alert");			
					alerter.classList.add("alert", "alert-success");
					alerter.innerHTML = "Done!";
				}
				else {	
					alerter.setAttribute("role", "alert");			
					alerter.classList.add("alert", "alert-danger");
					alerter.innerHTML = "Something went wrong! Check console for more info";
					
					console.error({ response });
				}
			}
		`;

		res.render("generic", {
			data: `
				<script>${script}</script>
				<h4 class="pt-3 text-center">
					<img alt="WEEWOO" src="/static/img/WEEWOO.gif">
					Emergency Supibot restart</h4>
					<img alt="WEEWOO" src="/static/img/WEEWOO.gif">
				</h4>
       			<div id="alert-anchor"></div>
       			<br>
       			<div class="px-2 py-2" id="form-wrapper">					
					<button id="execute" class="btn btn-danger" onclick="execute()">DO IT</button>			
       			</div>			
			`
		});
	});

	return Router;
})();
