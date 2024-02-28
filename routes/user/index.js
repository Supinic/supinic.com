const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const User = require("../../modules/chat-data/user-alias.js");

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

		const authKey = crypto.createHash("sha3-256")
			.update(userData.Name)
			.update(userData.ID.toString())
			.update(new sb.Date().valueOf().toString())
			.update(crypto.randomBytes(256).toString())
			.digest("hex");

		await User.setDataProperty(userData.ID, "authKey", authKey);

		await sb.Got("Supibot", {
			url: "user/invalidateCache",
			searchParams: {
				name: userData.Name
			}
		});

		res.send(200);
	});

	Router.delete("/auth-key", async (req, res) => {
		const { userData } = res.locals.authUser;

		await User.setDataProperty(userData.ID, "authKey", null);

		await sb.Got("Supibot", {
			url: "user/invalidateCache",
			searchParams: {
				name: userData.Name
			}
		});

		res.send(200);
	});

	Router.get("/auth-key", async (req, res) => {
		const { userData } = res.locals.authUser;

		const authKey = await User.getDataProperty(userData.ID, "authKey");
		const hasKey = Boolean(authKey);

		const fieldDisabled = (hasKey) ? "" : "disabled";
		const generateString = (hasKey) ? "Regenerate" : "Generate";
		const keyValue = (hasKey) ? authKey : "N/A";
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
		res.redirect(`/bot/user/${userData.Name}/alias/list`);
	});

	Router.get("/data/list", async (req, res) => {
		const { userData } = res.locals.authUser;
		const escapedUsername = encodeURIComponent(userData.Name);

		const searchParams = WebUtils.authenticateLocalRequest(userData.ID, null);
		const response = await sb.Got("Supinic", {
			url: `bot/user/${escapedUsername}/data/list`,
			searchParams: searchParams.toString()
		});

		if (response.statusCode !== 200) {
			return res.status(response.statusCode).render("error", {
				error: WebUtils.formatErrorMessage(response.statusCode),
				message: response.body.error.message
			});
		}

		const filterSearchParams = WebUtils.authenticateLocalRequest(userData.ID, null);
		const filterResponse = await sb.Got("Supinic", {
			url: `bot/filter/user/list`,
			searchParams: filterSearchParams.toString()
		});

		if (filterResponse.statusCode !== 200) {
			return res.status(filterResponse.statusCode).render("error", {
				error: WebUtils.formatErrorMessage(filterResponse.statusCode),
				message: filterResponse.body.error.message
			});
		}

		const subscriptionResponse = await sb.Got("Supinic", {
			url: `data/event-subscription/${userData.ID}/list`,
			searchParams: filterSearchParams.toString()
		});

		if (subscriptionResponse.statusCode !== 200) {
			return WebUtils.handleError(res, subscriptionResponse.statusCode, subscriptionResponse.body.error?.message);
		}

		const printData = {};
		const data = [
			{
				name: "activeFilters",
				type: "array",
				value: filterResponse.body.data.map(i => {
					const filteredObj = {};
					for (const [key, value] of Object.entries(i)) {
						if (value === null) {
							continue;
						}

						filteredObj[key] = value;
					}

					return filteredObj;
				})
			},
			{
				name: "subscriptions",
				type: "array",
				value: subscriptionResponse.body.data.map(i => {
					const filteredObj = {};
					for (const [key, value] of Object.entries(i)) {
						if (value === null) {
							continue;
						}

						filteredObj[key] = value;
					}

					return filteredObj;
				})
			},
			...response.body.data
		];

		for (const property of data) {
			let innerContent;
			if (property.type === "object" || property.type === "array") {
				innerContent = `<pre><code>${JSON.stringify(property.value, null, 4)}</code></pre>`;
			}
			else if (property.type === "function") {
				innerContent = "(function)";
			}
			else {
				innerContent = String(property.value);
			}

			const content = `<div id="${property.name}" class="collapse">${innerContent}</div>`;
			const section = sb.Utils.tag.trim `<a
				 class="btn btn-primary"
				 href="#${property.name}"
				 role="button"
				 data-toggle="collapse"
		         aria-expanded="false"
		         aria-controls=""${property.name}"
		         style="margin:3px"
	            >
	                Click to show
                </a>
            `;

			printData[property.name] = `${section}${content}`;
		}

		res.render("generic-detail-table", {
			data: printData,
			header: "Your Supibot data",
			title: "Custom user data list",
			openGraphDefinition: [
				{
					property: "title",
					content: `Custom user data`
				}
			]
		});
	});

	return Router;
})();
