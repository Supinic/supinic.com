module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => {
		const { data } = await sb.Got.instances.Supinic("track/author/list").json();
		const printData = data.map(row => {
			let youtubeRefer = "N/A";
			if (row.youtubeChannelID) {
				youtubeRefer = `<a target="_blank" rel="noopener noreferrer" href="//www.youtube.com/channel/${row.youtubeChannelID}">${row.youtubeName}</a>`;
			}
			else if (row.youtubeUserID) {
				youtubeRefer = `<a target="_blank" rel="noopener noreferrer" href="//www.youtube.com/user/${row.youtubeUserID}">${row.youtubeName}</a>`;
			}

			return {
				Detail: `<a target="_blank" href="/track/author/${row.ID}">${row.name}</a>`,
				Youtube: youtubeRefer,
				Country: row.country || "N/A"
			};
		});

		res.render("generic-list-table", {
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 25
		});
	});

	Router.get("/:id", async (req, res) => {
		const authorID = Number(req.params.id);
		const { data } = await sb.Got.instances.Supinic("track/author/" + authorID).json();
		const contactData = data.contacts.map(i => (
			`<li>${i.website}: <a target="_blank" rel="noopener noreferrer" href="${i.link}">${i.name}</a></li>`
		));

		const printData = {
			Name: data.name,
			"Also known as": (data.aliases.length > 0)
				? data.aliases.join("<br>")
				: "N/A",
			Country: (data.country) ?? "N/A",
			Contacts: (contactData.length > 0)
				? `<ul>${contactData.join("")}</ul>`
				: "N/A",
			Notes: data.notes ?? "N/A",
			Tracks: [
				"<table id='authorTracks'>",
				"<thead><tr><th>Track</th><th>Role</th><th>Published</th></tr></thead>",
				data.tracks
					.sort((a, b) => a.name.localeCompare(b.name))
					.map(i => [
						"<tr>",
						`<td><a target="_blank" href="/track/detail/${i.ID}">${i.name}</a></td>`,
						`<td>${i.role}</td>`,
						`<td>${(i.published) ? new sb.Date(i.published).sqlDate() : "N/A"}</td>`,
						"</tr>"
					].join(""))
					.join(""),
				"</table>"
			].join("")
		};

		res.render("author", {
			data: printData
		});
	});

	return Router;
})();