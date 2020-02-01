module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => {
		const rawData = JSON.parse(await sb.Utils.request("https://supinic.com/api/track/author/list"));
		if (!rawData || rawData.statusCode !== 200) {
			return res.status(404).render("error", {
				error: "500 Internal server error",
				message: "API/Data unavailable, contact administrator"
			});
		}

		const listData = rawData.data.map(row => {
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
			data: listData,
			head: Object.keys(listData[0]),
			pageLength: 25
		});
	});

	Router.get("/:id", async (req, res) => {
		const authorID = Number(req.params.id);
		const rawData = JSON.parse(await sb.Utils.request("https://supinic.com/api/track/author/" + authorID));
		if (!rawData || rawData.statusCode !== 200) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "Invalid ID"
			});
		}

		const authorData = rawData.data;
		let youtubeRefer = "N/A";
		if (authorData.youtubeChannelID) {
			youtubeRefer = `<a target="_blank" rel="noopener noreferrer" href="//www.youtube.com/channel/${authorData.youtubeChannelID}">${authorData.youtubeName}</a>`;
		}
		else if (authorData.youtubeUserID) {
			youtubeRefer = `<a target="_blank" rel="noopener noreferrer" href="//www.youtube.com/user/${authorData.youtubeUserID}">${authorData.youtubeName}</a>`;
		}

		const data = {
			Name: authorData.name,
			"Also known as": authorData.aliases
				? authorData.aliases.join("<br>")
				: "N/A",
			Country: (authorData.country)
				? authorData.country
				: "N/A",
			Bilibili: (authorData.bilibiliID)
				? `<a target="_blank" rel="noopener noreferrer" href="//space.bilibili.com/${authorData.bilibiliID}">${authorData.bilibiliID}</a>`
				: "N/A",
			Nicovideo: (authorData.nicovideoID)
				? `<a target="_blank" rel="noopener noreferrer" href="//nicovideo.jp/user/${authorData.nicovideoID}">${authorData.nicovideoID}</a>`
				: "N/A",
			Soundcloud: (authorData.soundcloudID)
				? `<a target="_blank" rel="noopener noreferrer" href="//soundcloud.com/${authorData.soundcloudID}">${authorData.soundcloudID}</a>`
				: "N/A",
			Twitter: (authorData.twitterID)
				? `<a target="_blank" rel="noopener noreferrer" href="//www.twitter.com/${authorData.twitterID}">${authorData.twitterID}</a>`
				: "N/A",
			Twitch: (authorData.userAlias)
				? `<a target="_blank" rel="noopener noreferrer" href="//twitch.tv/${authorData.userAlias.name}">${authorData.userAlias.name}</a>`
				: "N/A",
			Youtube: youtubeRefer,
			Notes: authorData.notes || "N/A",
			Tracks: [
				"<table id='authorTracks'>",
				"<thead><tr><th>Track</th><th>Role</th><th>Published</th></tr></thead>",
				authorData.tracks
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
			data: data
		});
	});

	return Router;
})();