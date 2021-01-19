module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const prettifyAliasData = (aliases) => Object.values(aliases).map(alias => ({
		Name: alias.name,
		Invocation: alias.invocation + " " + alias.args.join(" "),
		Created: (alias.created)
			? new sb.Date(alias.created).format("Y-m-d H:i")
			: "N/A",
		Edited: (alias.lastEdit)
			? new sb.Date(alias.lastEdit).format("Y-m-d H:i")
			: "N/A"
	}));

	const routes = [];
	for (const [name, link] of routes) {
		Router.use("/" + name, require("./" + link))
	}

	Router.use("/", async (req, res, next) => {
		if (!res.locals.authUser) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: `You must be logged in to access this page`
			});
		}
		else if (res.locals.authUser.userData === null) {
			return res.status(401).render("error", {
				error: "202 Accepted",
				message: `Your account is new and has not been setup yet. This page will automatically refresh in 30 seconds.`,
				extraScript: `window.onload = () => setTimeout(() => location.reload(), 30000);`
			});
		}

		next();
	});

	Router.get("/logout", async (req, res) => {
		req.session.destroy();
		res.redirect("/");
	});

	Router.post("/auth-key", async (req, res) => {
		const { userData } = res.locals.authUser;
		const crypto = require("crypto");

		userData.Data.authKey = crypto.createHash("sha3-256")
			.update(userData.Name)
			.update(userData.ID.toString())
			.update(new sb.Date().valueOf().toString())
			.update(crypto.randomBytes(256).toString())
			.digest("hex");

		await userData.saveProperty("Data", userData.Data);
		await sb.WebUtils.invalidateBotCache({
			type: "user",
			username: userData.Name
		});

		res.send(200);
	});

	Router.delete("/auth-key", async (req, res) => {
		const { userData } = res.locals.authUser;
		userData.Data.authKey = null;

		await userData.saveProperty("Data", userData.Data);
		await sb.WebUtils.invalidateBotCache({
			type: "user",
			username: userData.Name
		});

		res.send(200);
	});

	Router.get("/auth-key", async (req, res) => {
		const { userData } = res.locals.authUser;
		const hasKey = Boolean(userData.Data.authKey);

		const fieldDisabled = (hasKey) ? "" : "disabled";
		const generateString = (hasKey) ? "Regenerate" : "Generate";
		const keyValue = (hasKey) ? userData.Data.authKey : "N/A";
		const keyFieldType = (hasKey) ? "password" : "string";

		const script = sb.Utils.tag.trim `
			const processResponse = (response) => {				
				if (response.status === 200) {
					location.reload();
				}
				else {	
					const alerter = document.getElementById("alert-anchor");	
					alerter.setAttribute("role", "alert");			
					alerter.classList.add("alert", "alert-danger");
					alerter.innerHTML = "Operation failed!";
				}
			};

			async function generate () {	
				if (!confirm("${generateString} your authentication key?")) {
					return;
				}
				
				const response = await fetch("/user/auth-key", { method: "POST" });				
				processResponse(response);
			}
			
			async function remove () {
				if (!confirm("Remove your authentication key?")) {
					return;
				}

				const response = await fetch("/user/auth-key", { method: "DELETE" });					
				processResponse(response);
			}
			
			function clipboard () {
				const element = document.getElementById("authkey");
				navigator.clipboard.writeText(element.value);
			}
		`;

		res.render("generic", {
			data: `
				<script>${script}</script>
				<h5 class="pt-3 text-center">API authentication key</h5>
       			<div id="alert-anchor"></div>
       			<br>
       			<div class="px-2 py-2" id="form-wrapper">
       				<div class="form-group">
                    	<label for="userid">
		                    Your user ID
                        </label>
                        <input id="userid" type="string" class="form-control" disabled value="${userData.ID}">    
					</div>
       			
       				<div class="form-group">
                    	<label for="authkey">
                    		Authentication key
                        </label>
                        <input id="authkey" type="${keyFieldType}" class="form-control" disabled value="${keyValue}">      			   
					</div>
					
					<button id="generate" class="btn btn-primary" onclick="generate()">${generateString}</button>
					<button id="remove" class="btn btn-primary" onclick="remove()" ${fieldDisabled}>Remove</button>
					<button id="copy" class="btn btn-primary" onclick="clipboard()" ${fieldDisabled}>Copy to clipboard</button>				
       			</div>			
			`
		});
	});

	Router.get("/alias/list", async (req, res) => {
		const { userData } = res.locals.authUser;
		const aliases = userData.Data.aliasedCommands ?? {};

		const printData = prettifyAliasData(aliases);
		res.render("generic-list-table", {
			data: printData,
			head: ["Name", "Invocation", "Created", "Edited"],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	Router.get("/alias/find", async (req, res) => {
		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Search for another user's aliases</h5>
	            <div id="alert-anchor"></div>
			`,
			onSubmit: "submit()",
			fields: [
				{
					id: "user-name",
					name: "User name",
					type: "string"
				}
			],
			script: sb.Utils.tag.trim`
				async function submit (element) {
					const userName = encodeURIComponent(document.getElementById("user-name").value).toLowerrCase();
					const alerter = document.getElementById("alert-anchor");
										
					try {
						const response = await fetch("/api/bot/user/resolve/name/" + userName);
						const { data } = await response.json();
						
						location.replace("/user/alias/" + userName + "/list";
					}
					catch (e) {
						console.error(e);
						alerter.classList.add("alert");
						alerter.classList.add("alert-danger");
						alerter.innerHTML = "User was not found!";
					}
				}
			`
		});
	});

	Router.get("/alias/:username/list", async (req, res) => {
		const { username } = req.params;
		const userData = await sb.User.get(username);
		if (!userData) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "That user does not exist"
			});
		}
		else if (!userData.Data.aliasedCommands) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "That user has never set up any aliases"
			});
		}

		const printData = prettifyAliasData(userData.Data.aliasedCommands);
		res.render("generic-list-table", {
			data: printData,
			head: ["Name", "Invocation", "Created", "Edited"],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true
		});
	});

	return Router;
})();e