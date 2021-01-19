module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const UserAlias = require("../../../modules/chat-data/user-alias.js");

	const fetchUserData = async (res, type, id) => {
		const callback = (type === "user-name")
			? (q) => q.where("Name = %s", id)
			: (q) => q.where("ID = %n", Number(id));

		const userData = await UserAlias.selectSingleCustom(callback);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 404, "User not found");
		}
		else {
			return sb.WebUtils.apiSuccess(res, {
				ID: userData.ID,
				name: userData.Name
			});
		}
	};
	const prettifyAliasData = (aliases) => Object.entries(aliases).map(([aliasName, alias]) => ({
		Name: aliasName,
		Invocation: alias.invocation + " " + alias.args.join(" "),
		Created: (alias.created)
			? new sb.Date(alias.created).format("Y-m-d H:i")
			: "N/A",
		Edited: (alias.lastEdit)
			? new sb.Date(alias.lastEdit).format("Y-m-d H:i")
			: "N/A"
	}));

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
					const userName = encodeURIComponent(document.getElementById("user-name").value).toLowerCase();
					const alerter = document.getElementById("alert-anchor");
						
					const response = await fetch("/api/bot/user/resolve/name/" + userName);
					const { data } = await response.json();
					if (data) {					
						location.replace("/user/alias/" + userName + "/list");
					}
					else {
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

	/**
	 * @api {get} /bot/user/resolve/name/:name Fetch user by username
	 * @apiName FetchUserByUsername
	 * @apiDescription Fetches user identifiers, based on username
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} name
	 * @apiError (404) NotFound User was not found
	 **/
	Router.get("/resolve/name/:name", async (req, res) => {
		return await fetchUserData(res, "user-name", req.params.name);
	});

	/**
	 * @api {get} /bot/user/resolve/ID/:id Fetch user by ID
	 * @apiName FetchUserByID
	 * @apiDescription Fetches user identifiers, based on ID
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiSuccess {number} ID
	 * @apiSuccess {string} name
	 * @apiError (404) NotFound User was not found
	 **/
	Router.get("/resolve/ID/:id", async (req, res) => {
		return await fetchUserData(res, "user-id", req.params.id);
	});

	return Router;
})();