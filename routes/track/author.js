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

		let youtubeRefer = "N/A";
		if (data.youtubeChannelID) {
			youtubeRefer = `<a target="_blank" rel="noopener noreferrer" href="//www.youtube.com/channel/${data.youtubeChannelID}">${data.youtubeName}</a>`;
		}
		else if (data.youtubeUserID) {
			youtubeRefer = `<a target="_blank" rel="noopener noreferrer" href="//www.youtube.com/user/${data.youtubeUserID}">${data.youtubeName}</a>`;
		}

		const printData = {
			Name: data.name,
			"Also known as": data.aliases
				? data.aliases.join("<br>")
				: "N/A",
			Country: (data.country)
				? data.country
				: "N/A",
			Bilibili: (data.bilibiliID)
				? `<a target="_blank" rel="noopener noreferrer" href="//space.bilibili.com/${data.bilibiliID}">${data.bilibiliID}</a>`
				: "N/A",
			Nicovideo: (data.nicovideoID)
				? `<a target="_blank" rel="noopener noreferrer" href="//nicovideo.jp/user/${data.nicovideoID}">${data.nicovideoID}</a>`
				: "N/A",
			Soundcloud: (data.soundcloudID)
				? `<a target="_blank" rel="noopener noreferrer" href="//soundcloud.com/${data.soundcloudID}">${data.soundcloudID}</a>`
				: "N/A",
			Twitter: (data.twitterID)
				? `<a target="_blank" rel="noopener noreferrer" href="//www.twitter.com/${data.twitterID}">${data.twitterID}</a>`
				: "N/A",
			Twitch: (data.userAlias)
				? `<a target="_blank" rel="noopener noreferrer" href="//twitch.tv/${data.userAlias.name}">${data.userAlias.name}</a>`
				: "N/A",
			Youtube: youtubeRefer,
			Notes: data.notes || "N/A",
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