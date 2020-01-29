module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const normal = new Map();

	Router.get("/", async (req, res) => {
		const {string} = req.query;
		if (!string) {
			return sb.WebUtils.apiFail(res, 400, "No query provided");
		}

		if (normal.size === 0) {
			const rawData = await sb.Query.getRecordset(rs => rs.select("*").from("api", "Text_Normalization"));
			for (const {Character: char, Normalization: output, Type: type} of rawData) {
				normal.set(char, (type === "Array") ? JSON.parse(output) : output);
			}
		}

		const output = [];
		const unknown = new Set();
		const unrecognized = new Set();

		for (const character of string) {
			const normalizedCharacter = normal.get(character);
			if (normalizedCharacter === undefined) {
				output.push(character);
				unrecognized.add(character);
			}
			else if (normalizedCharacter === null) {
				output.push(character);
				unknown.add(character);
			}
			else {
				output.push(normalizedCharacter);
			}
		}

		return sb.WebUtils.apiSuccess(res, {
			output: output.join(""),
			output_array: output,
			unknown: Array.from(unknown),
			unrecognized: Array.from(unrecognized)
		});
	});

	Router.get("/reload", async (req, res) => {
		normal.clear();
		return sb.WebUtils.apiSuccess(res, true);
	});

	return Router;
})();