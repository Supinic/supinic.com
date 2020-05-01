module.exports = (function () {
	"use strict";
	
	const Gachi = require("../modules/gachi.js");
	const Express = require("express");
	const Router = Express.Router();

	Gachi.init();

	Router.get("/list", async (req, res) => {
		const data = await Gachi.getAll();
		res.render("gachi-list", { data });
	});

	Router.get("/detail/:id", async (req, res) => {
		const id = Number(req.params.id);
		if (Number.isNaN(id) || id === Infinity || id < 1 || Math.trunc(id) !== id) {
			res.status(404).render("error", {
				error: "404 Not Found",
				message: "Malformed ID"
			});
			return;
		}

		const data = await Gachi.get(id);
		if (data === null) {
			res.status(404).render("error", {
				error: "404 Not Found",
				message: "ID out of bounds"
			});
			return;
		}

		const findTrack = await sb.Query.getRecordset(rs => rs
			.select("Track.ID")
			.from("music", "Track")
			.join("data", {
				raw: "data.Gachi ON Track.Link = Gachi.Link"
			})
			.where("Gachi.ID = %n", id)
			.limit(1)
			.single()
		);

		res.redirect("/track/detail/" + findTrack.ID);
	});

	Router.get("/legacyDetail/:id", async (req, res) => {
		const id = Number(req.params.id);
		if (Number.isNaN(id) || id === Infinity || id < 1 || Math.trunc(id) !== id) {
			res.status(404).render("error", {
				error: "404 Not Found",
				message: "Malformed ID"
			});
			return;
		}

		const data = await Gachi.get(id);
		if (data === null) {
			res.status(404).render("error", {
				error: "404 Not Found",
				message: "ID out of bounds"
			});
			return;
		}

		// @todo MOVE THIS TO MODULES
		const [prefix, youtubePrefix, backupPrefix] = await Promise.all([
			Gachi.getPrefix(data.Video_Type),
			Gachi.getPrefix(1),
			Gachi.getPrefix(23)
		]);
		const embedLink = (data.Video_Type === 1)
			? "https://www.youtube.com/embed/" + data.Link
			: (data.Video_Type === 21)
				? "https://embed.nicovideo.jp/watch/" + data.Link
				: null; // @todo add other embeds

		res.render("gachi-detail", {
			printData: {
				Author: data.Author,
				Name: data.Foreign_Name || data.Name,
				Normalized_Name: (data.Foreign_Name) ? data.Name : "N/A",
				Link: prefix.replace("$", data.Link),
				Youtube_Reupload: (data.Youtube_Link) ? youtubePrefix.replace("$", data.Youtube_Link) : "N/A",
				Based_On: data.Based_On || (!data.Based_On && !data.Based_On_Link && "(original work)") || "N/A",
				Based_On_Link: (data.Based_On_Link) ? youtubePrefix.replace("$", data.Based_On_Link) : "N/A",
				Published: (data.Published) ? data.Published.format("Y-m-d") : "N/A",
				Length: sb.Utils.formatTime(data.Length),
				Notes: data.Notes || "N/A",
				Added_By: data.Added_By || "(administrator)",
				Audio_Backup: (data.Audio_Backup) ? backupPrefix.replace("$", data.Audio_Backup) : "N/A"
			},
			embed: {
				type: data.Video_Type,
				link: embedLink,
				original: (data.Based_On_Link && !data.Based_On_Link.includes(" "))
					? ("https://www.youtube.com/embed/" + data.Based_On_Link)
					: null,
				reupload: (data.Youtube_Link)
					? ("https://www.youtube.com/embed/" + data.Youtube_Link)
					: null
			}
		});
	});

	Router.get("/edit/:id", async (req, res) => {
		return res.status(503).render("error", {
			error: "503",
			message: "Temporarily disabled - will come back with the full rework of music tracks. Stay tuned!"
		});
	});

	Router.post("/edit/:id", async (req, res) => {
		res.status(503).render("error", {
			error: "503",
			message: "Temporarily disabled - will come back with the full rework of music tracks. Stay tuned!"
		});
	});

	Router.get("/add", async (req, res) => {
		return res.status(503).render("error", {
			error: "503",
			message: "Temporarily disabled - will come back with the full rework of music tracks. Stay tuned!"
		});
	});	

	Router.post("/add", async (req, res) => {
		return res.status(503).render("error", {
			error: "503",
			message: "Temporarily disabled - will come back with the full rework of music tracks. Stay tuned!"
		});
	});

	Router.get("/guidelines", async (req, res) => {
		res.render("gachi-guidelines");
	});

	Router.get("/archive", async (req, res) => {
		res.redirect("https://gachi.ivr.fi");
	});

	Router.get("/resources", async (req, res) => {
		res.redirect("https://docs.google.com/spreadsheets/d/1vxwhOml19YxV_Xu_0ugvyvZiyExZyE6nALiXX9G3v7E");
	});

	return Router;
})();