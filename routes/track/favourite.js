module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const prettify = (res, data) => {
		const printData = data.filter(i => i.active && i.userAlias === userID).map(i => ({
			Track: `<a href="/track/detail/${i.track}">${i.trackName}</a>`,
			Created: new sb.Date(i.created).format("Y-m-d H:i:s"),
			Edited: (i.lastEdit)
				? new sb.Date(i.created).format("Y-m-d H:i:s")
				: "N/A"
		}));

		res.render("generic-list-table", {
			head: ["Track", "Created", "Edited"],
			data: printData,
			pageLength: 25
		});
	};

	Router.get("/find", async (req, res) => {
		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Search another user's favourites</h5>
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
					const userName = encodeURIComponent(document.getElementById("user-name").value);
					const alerter = document.getElementById("alert-anchor");
										
					try {
						const { data } = await fetch("/api/bot/user/resolve/name/" + userName).json();
						location.replace("/track/favourite/list/user/" + data.ID);
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

	Router.get("/list", async (req, res) => {
		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (!userID) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your favourites"
			});
		}

		const { data } = await sb.Got.instances.Supinic("track/favourite/list").json();
		return prettify(res, data);
	});

	Router.get("/list/user/:id", async (req, res) => {
		const userID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(userID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "User with that ID does not exist"
			});
		}

		const { data } = await sb.Got.instances.Supinic(`track/favourite/user/${userID}`).json();
		return prettify(res, data);
	});

	return Router;
})();