module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/", async (req, res) => res.sendStatus(200));

	Router.get("/new", async (req, res) => {
		res.render("track-add");
	});

	Router.get("/:id", async (req, res) => {
		const trackID = Number(req.params.id);
		const { statusCode, body } = await sb.Got("Supinic", "track/detail/" + trackID);

		if (statusCode !== 200 || body.data === null) {
			return res.status(404).render("error", {
				error: "404 Not Found",
				message: "Invalid ID"
			});
		}

		let embed = "N/A";
		const trackData = body.data;

		switch (trackData.videoType) {
			case 1: {
				embed = `<iframe width="320px" height="166" scrolling="no" frameborder="no" src="https://www.youtube.com/embed/${trackData.link}">`;
				break;
			}
			case 3: {
				const data = await sb.Utils.linkParser.fetchData(trackData.parsedLink);
				if (!data) {
					embed = `<div>Track not available</div>`
				}
				else {
					embed = `<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${data.extra.apiID}&amp;color=0066cc"></iframe>`;
				}

				break;
			}
			case 4: {
				embed = `<iframe src="//player.vimeo.com/video/${trackData.link}" width="320px" height="166px" frameborder="0" allowfullscreen=""></iframe>`;
				break;
			}
			case 21: {
				embed = `<iframe width="320px" height="166" scrolling="no" frameborder="no" src="https://embed.nicovideo.jp/watch/${trackData.link}">`;
				break;
			}
			case 22: {
				let suffix = "";
				let link = trackData.link;
				if (trackData.link.includes("/?p=")) {
					const number = link.match(/\/\?p=(\d+)$/)[1];
					suffix = "&page=" + number;
					link = trackData.link.replace(/\/\?p=\d+/, "");
				}

				embed = `<iframe src="//player.bilibili.com/player.html?aid=${link.replace(/av/, "")}${suffix}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 320px; height: 166px; max-width: 100%"></iframe>`;
				break;
			}
			case 23: {
				embed = `<audio style="width:100%" controls><source src="${trackData.parsedLink}"></audio>`;
				break;
			}
			case 25:
			case 26: {
				embed = `<video width="320" height="166" controls style="width:100%"><source type="video/mp4" src="${trackData.parsedLink}"></video>`;
				break;
			}
		}

		const data = {
			ID: trackData.ID,
			Name: trackData.name || "N/A",
			Aliases: trackData.aliases.join("<br>") || "N/A",
			Link: `<a href="${trackData.parsedLink}" rel="noopener noreferrer" target="_blank">${trackData.parsedLink}</a>`,
			"Track type": trackData.trackType || "Unknown",
			Duration: trackData.duration || "N/A",
			Favourites: trackData.favourites,
			Available: String(trackData.available),
			Published: (trackData.published) ? new sb.Date(trackData.published).sqlDate() : "N/A",
			Tags: (Array.isArray(trackData.tags))
				? trackData.tags.join(", ")
				: "(none)",

			Authors: trackData.authors.map(i => ({
				name: `<a target='_blank' href='/track/author/${i.ID}'>${i.name}</a>`,
				role: sb.Utils.capitalize(i.role)
			})),
			"Related tracks": trackData.relatedTracks.map(i => {
				const obj = {
					notes: i.notes,
					relationship: i.relationship
				};

				if (i.fromID === trackData.ID) {
					const name = sb.Utils.wrapString(i.name ?? String(i.toID), 50);
					obj.from = "This";
					obj.to = `<a title='ID ${i.toID}: ${name}' href='/track/detail/${i.toID}'>${name}</a>`;
				}
				else if (i.toID === trackData.ID) {
					const name = sb.Utils.wrapString(i.name ?? String(i.fromID), 50);
					obj.from = `<a title='ID ${i.fromID}: ${name}' href='/track/detail/${i.fromID}'>${name}</a>`;
					obj.to = "This";
				}
				return obj;
			}),

			"Added on": (trackData.addedOn) ? new sb.Date(trackData.addedOn).sqlDate() : "N/A",
			"Added by": (trackData.addedBy) ? trackData.addedBy : "N/A",
			Notes: (trackData.notes) ? (trackData.notes.replace(/\n/g, "<br>")) : "N/A",
			Embed: embed
		};

		let favourite = "none";
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.userID) {
			// data can be null (if no favourite exists) or a proper API response
			const { data } = await sb.Got("Supinic", {
				url: `track/favourite/user/${auth.userID}/track/${trackID}`
			}).json();

			favourite = (data?.active) ? "active" : "inactive";
		}

		res.render("track-detail", {
			title: `Track ${trackData.ID} - ${trackData.name}`,
			favourite,
			ID: trackData.ID,
			data: data
		});
	});

	return Router;
})();
