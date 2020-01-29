module.exports = (function () {
	"use strict";
	
	const Gachi = require("../modules/gachi.js");
	const User = require("../modules/user.js");

	const Express = require("express");
	const Router = Express.Router();
	
	const typeID = {
		Youtube: 1,
		Nicovideo: 21,
		Bilibili: 22,
		Vimeo: 4,
		Soundcloud: 3,
		VK: 24
	};

	Gachi.init();

	const addOrEdit = async (req, res, redirectURL) => {
		const fields = Gachi.fields;
		const ID = Number(req.body.ID) || null;
		let data = {};

		try {
			if (!res) {
				return res.status(401).render("error", {
					error: "401 Unauthorized",
					message: "Your session timed out, please log in again"
				});
			}
			else if (!res.locals.authUser) {
				return res.statusCode(401).render("error", { 
					error: "401 Unauthorized",
					message: "User must be logged in before adding or editing"
				});
			}

			console.log("Raw gachi data incoming", req.body);
			for (const field of fields) {
				const name = field.name;
				if (name === "Video_Type") {
					data[name] = typeID[req.body[name]];
				}
				else if (name === "Length") {
					data[name] = Number(req.body[name]);
				}
				else if (name === "Published") {
					data[name] = new sb.Date(req.body[name]);
				}
				else if (name === "Added_On") {
					continue;
				}
				else {
					data[name] = req.body[name] || null;
				}
			}

			if (ID === null) {
				data.Added_By = await User.getID(res.locals.authUser.login);
			}

			for (const field of fields) {
				if (field.required && typeof data[field.name] === "undefined") {
					throw new Error("Missing required field: " + field.name);
				}
			}

			if (data.Youtube_Link) {
				data.Youtube_Link = (data.Youtube_Link.match(/([A-Za-z0-9_-]{11})/) || [])[1];
				if (!data.Youtube_Link) {
					throw new Error("Malformed reupload link");
				}
			}

			if (data.Based_On_Link) {
				data.Based_On_Link = (data.Based_On_Link.match(/([A-Za-z0-9_-]{11})/) || [])[1];
				if (!data.Based_On_Link) {
					throw new Error("Malformed original version link");
				}
			}

			switch (data.Video_Type) {
				case 1:  
					data.Link = (data.Link.match(/([A-Za-z0-9_-]{11})/) || [])[1];
					break;

				case 21:
					data.Link = (data.Link.match(/([sn]m\d+)/))[1];
					break;

				case 22:
					data.Link = (data.Link.match(/(av\d+)/))[1];
					break;

				case 4:
					data.Link = (data.Link.match(/(\d+)/))[1];
					break;

				case 3: 
					data.Link = (data.Link.match(/(soundcloud.com\/[\w-]+\/[\w-]+)/))[1];
					if (data.Link) {
						data.Link = "https://" + data.Link;
					}
					break;

				case 24:
					data.Link = (data.Link.match(/(\d{9}_\d{9})/))[1];
					break;

				default: throw new Error("Unknown video type: " + req.body.Video_Type + " (" + typeID[req.body.Video_Type] + ")");
			}

			if (!data.Link) {
				throw new Error("Malformed video link");
			}

			const newID = await Gachi.updateOrInsert(ID, data);

			console.log(newID);

			if (newID !== ID) {
				const params = new sb.URLParams()
					.set("type", "watch")
					.set("table", "Gachi")
					.set("ID", newID);

				sb.InternalRequest.send(params);
			}
		}
		catch (err) {
			if (err.message.toLowerCase().includes("duplicate")) {
				err.message = "Video with that link already exists in the database";
			}

			res.render("error", {
				error: "500 Internal Server Error",
				message: "Could not process request: " + err.message
			});

			return;
		}

		res.redirect(redirectURL);
	};

	Router.get("/list", async (req, res) => {
		const data = await Gachi.getAll();
		
		res.render("gachi-list", {
			data: data
		});
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

		// @todo TESTING !!!
		const findTrack = await sb.Query.getRecordset(rs => rs
			.select("Track.ID")
			.from("music", "Track")
			.join("data", {
				raw: "data.Gachi ON Track.Link = Gachi.Link"
			})
			.where("Gachi.ID = %n", id)
			.single()
		);

		res.redirect("/track/detail/" + findTrack.ID);

		return;


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

		if (!res.locals.authUser) {
			res.render("gachi-edit", {
				required: {},
				types: {},
				data: {}
			});
			return;
		}

		const fields = Gachi.fields;
		const id = Number(req.params.id);
		if (Number.isNaN(id) || id === Infinity || id < 1 || Math.trunc(id) !== id) {
			res.status(404).render("error", {
				error: "404 Not Found",
				message: "ID not a valid number"
			});
			return;
		}

		let types = {};
		let required = {};
		let data = await Gachi.get(id);
		if (data === null) {
			res.status(404).render("error", {
				error: "404 Not Found",
				message: "ID does not exist"
			});
			return;
		}

		if (data.Published) {
			data.Published = data.Published.format("Y-m-d");
		}

		for (const key of Object.keys(data)) {
			const field = fields.find(i => i.name === key);
			if (!field) {
				console.log("Could not find", key);
				continue;
			}

			if (field.adminOnly && !res.locals.authUser.admin) {
				delete data[key];
				continue;
			}

			required[key] = field.required;
			types[key] = fields.htmlType;
			data[key] = (data[key] === null) ? "<NULL>" : data[key];
		}

		res.render("gachi-edit", {
			required: required,
			types: types,
			data: data
		});
	});

	Router.post("/edit/:id", async (req, res) => {
		res.status(503).render("error", {
			error: "503",
			message: "Temporarily disabled - will come back with the full rework of music tracks. Stay tuned!"
		});

		// const ID = Number(req.body.ID);
		// addOrEdit(req, res, "/gachi/detail/" + ID);
	});

	Router.get("/todo", async (req, res) => {
		const rawData = await Gachi.getTodoList();
		const css = "<style type='text/css'>body { background-color:#111; color: white; } a:visited { color:darkviolet; } a { color:dodgerblue; } </style>";

		const header = [
			"<h4>",
			"Unfinished: " + rawData.filter(i => !i.Notes && !i.Result && !i.Rejected).length,
			"Noted (reuploads): " + rawData.filter(i => i.Notes && !i.Result && !i.Rejected).length,
			"Rejected: " + rawData.filter(i => i.Rejected).length,
			"Finished: " + rawData.filter(i => i.Result && !i.Rejected).length,
			"</h4>"
		].join("<br>");

		const sendData = rawData.sort((a, b) => a.ID - b.ID).map(row => {
			const notes = (row.Notes) ? ("<ul><li>" + row.Notes + "</li></ul>") : "";
			if (row.Rejected) {
				return "<li>ID " + row.ID + ": <del>" + row.Link + "</del>" + notes + "</li>";
			}
			else if (row.Result) {
				// return `<li>ID ${row.ID}: Finished${notes}</li>`;
			}
			else {
				return `<li>ID ${row.ID}: <a rel="noopener noreferrer" target="_blank" href="${row.Link_Prefix.replace("$", row.Link)}">${row.Link}</a>` + notes + "</li>";
			}
		}).filter(Boolean).join("");

		res.set("Content-Type", "text/html");
		res.send("<h1>lidl ass todo list</h1><ul>" + css + header + sendData + "</ul>");
	});

	Router.get("/add", async (req, res) => {
		return res.status(503).render("error", {
			error: "503",
			message: "Temporarily disabled - will come back with the full rework of music tracks. Stay tuned!"
		});

		// res.render("gachi-add");
	});	

	Router.post("/add", async (req, res) => {
		return res.status(503).render("error", {
			error: "503",
			message: "Temporarily disabled - will come back with the full rework of music tracks. Stay tuned!"
		});

		// addOrEdit(req, res, "/gachi/list");
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