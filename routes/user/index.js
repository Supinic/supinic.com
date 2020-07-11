module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const UserAlias = require("../../modules/chat-data/user-alias.js");

	const reloadSpecificUserCache = async (username) => {
		const params = new sb.URLParams()
			.set("type", "reload")
			.set("module", "user")
			.set("username", username);

		await sb.InternalRequest.send(params);
	};

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
		await reloadSpecificUserCache(userData.Name);

		res.send(200);
	});

	Router.delete("/auth-key", async (req, res) => {
		const { userData } = res.locals.authUser;
		userData.Data.authKey = null;

		await userData.saveProperty("Data", userData.Data);
		await reloadSpecificUserCache(userData.Name);

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
       			<div class="px-4" id="form-wrapper">
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

		const printData = Object.values(aliases).map(alias => ({
			Name: alias.name,
			Invocation: alias.invocation + " " + alias.args.join(" "),
			Created: (alias.created)
				? new sb.Date(alias.created).format("Y-m-d H:i")
				: "N/A",
			Edited: (alias.lastEdit)
				? new sb.Date(alias.lastEdit).format("Y-m-d H:i")
				: "N/A"
		}));

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
})();