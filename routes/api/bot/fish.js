const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	const fetchAllFishData = async () => await sb.Query.getRecordset(rs => rs
		.select("User_Alias.Name AS Username")
		.select("Value")
		.from("chat_data", "User_Alias_Data")
		.join("chat_data", "User_Alias")
		.where("Property = %s", "fishData")
		.where("Value IS NOT NULL")
	);

	const fetchSpecificUserFshData = async (username) => await sb.Query.getRecordset(rs => rs
		.select("User_Alias.Name AS Username")
		.select("Value")
		.from("chat_data", "User_Alias_Data")
		.join("chat_data", "User_Alias")
		.where("User_Alias.Name = %s", username)
		.where("Property = %s", "fishData")
		.where("Value IS NOT NULL")
		.single()
	);

	Router.get("/detail/:username", async (req, res) => {
		const rawFishData = await fetchSpecificUserFshData(req.params.username);
		if (!rawFishData) {
			return WebUtils.apiFail(res, 404, "User or fishing data not found");
		}

		const fishData = JSON.parse(rawFishData.Value);
		const data = {
			username: rawFishData.Username,
			fish: {
				catch: fishData.catch,
				coins: fishData.coins,
				lifetime: fishData.lifetime
			}
		};

		WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	Router.get("/list/current/client", async (req, res) => {
		const fishData = await fetchAllFishData();
		const data = fishData.map(i => {
			const rowData = JSON.parse(i.Value);
			return {
				User: i.Username,
				Fish: rowData.catch.fish ?? 0,
				Junk: rowData.catch.junk ?? 0,
				Coins: rowData.coins ?? 0
			};
		});

		WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	Router.get("/list/total/client", async (req, res) => {
		const fishData = await fetchAllFishData();
		const data = fishData.map(i => {
			const rowData = JSON.parse(i.Value);
			return {
				User: i.Username,
				Attempts: rowData.lifetime.attempts ?? 0,
				Fish: rowData.lifetime.fish ?? 0,
				Junk: rowData.lifetime.junk ?? 0,
				Coins: rowData.lifetime.coins ?? 0
			};
		});

		WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	return Router;
})();
