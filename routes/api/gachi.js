module.exports = (function () {
	"use strict";
	const Express = require("express");
	const Router = Express.Router();
	const Gachi = require("../../modules/gachi.js");

	const fail = (res, data) => {
		res.type("application/json")
			.status(500)
			.send(JSON.stringify({ statusCode: 500, error: data }));
	};

	Router.post("/edit", async (req, res) => {
		return fail(res, "Not yet tested");

		const fields = Gachi.fields;
		const id = Number(req.params.id) || null;
		let data = {};

		for (const field of fields) {
			const name = field.name;
			if (field.jsType === "date") {
				data[name] = new Date(req.params[name]);
				if (Number.isNaN(data[name].valueOf())) {
					return fail(res, { reason: "Unprocessable date", value: req.params[name] });
				}
			}
			else if (field.jsType === "boolean") {
				data[name] = Boolean(req.params[name]);
			}
			else if (field.jsType === "number") {
				data[name] = Number(req.params[name]);
				if (Number.isNaN(data[name])) {
					return fail(res, { reason: "Unprocessable number", value: req.params[name] });
				}
			}
			else {
				data[name] = req.params[name];
			}
		}

		const required = Object.keys(data).filter(i => fields[i].required);
		if (required.length !== fields.filter(i => i.required).length) {
			return fail(res, { reason: "Missing required fields", value: required });
		}

		try {
			await Gachi.updateOrInsert(id, data);
		}
		catch (e) {
			return fail(res, { reason: e.toString() });
		}

		res.sendStatus(200).render(JSON.stringify({
			success: true
		}));
	});

	Router.get("/list", async (req, res) => {
		const rawData = await Gachi.getAll();
		const sendData = rawData.map(row => ({
			ID: row.ID,
			author: row.Author,
			name: row.Name,
			link: row.Main_Link,
			alternateLink: row.Other_Link || null,
			published: row.Published,
			addedBy: row.Added_By || null
		})).sort((a, b) => a.ID - b.ID);

		res.set("Content-Type", "application/json");
		res.send(JSON.stringify({
			requestTimestamp: new Date().toJSON(),
			statusCode: 200,
			deprecated: true,
			list: sendData
		}))
	});

	Router.get("/todo/:filter*?", async (req, res) => {
		const rawData = await Gachi.getTodoList();
		let sendData = rawData.map(row => {
			let status = null;
			if (row.Result) {
				status = "completed";
			}
			else if (row.Rejected) {
				status = "rejected";
			}
			else {
				status = "pending";
			}

			return {
				ID: row.ID,
				rawLink: row.Link,
				link: row.Link_Prefix.replace("$", row.Link),
				videoType: row.Type,
				status: status,
				resultID: row.Result || null,
				reupload: (status === "completed")
					? Boolean(row.Rejected && row.Result)
					: null,
				notes: row.Notes || null
			};
		}).sort((a, b) => a.ID - b.ID);

		if (req.params.filter) {
			if (!["completed", "rejected", "pending"].includes(req.params.filter)) {
				return fail(res, "Invalid filter");
			}

			sendData = sendData.filter(i => i.status === req.params.filter);
		}

		res.set("Content-Type", "application/json");
		res.send(JSON.stringify({
			requestTimestamp: new sb.Date().valueOf(),
			status: 200,
			length: sendData.length,
			list: sendData
		}))
	});

	Router.get("/get/:id", async (req, res) => {
		return fail(res, "Not yet implemented");
	});

	return Router;
})();