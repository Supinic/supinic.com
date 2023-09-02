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
		.select("Value")
		.from("chat_data", "User_Alias_Data")
		.join("chat_data", "User_Alias")
		.where("User_Alias.Name = %s", username)
		.where("Property = %s", "fishData")
		.where("Value IS NOT NULL")
	);

	Router.get("/detail/:username", async (req, res) => {
		const fishData = await fetchSpecificUserFshData();
		if (!fishData) {
			return WebUtils.apiFail(res, 404, "User or fishing data not found");
		}

		WebUtils.apiSuccess(res, fishData, {
			skipCaseConversion: true
		});
	});

	Router.get("/list/current/client", async (req, res) => {
		const fishData = await fetchAllFishData();
		const data = fishData.map(i => {
			const rowData = JSON.parse(i.Value);
			return {
				user: i.Username,
				current: {
					fish: rowData.current.fish,
					junk: rowData.current.junk,
					coins: rowData.coins
				}
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
				user: i.Username,
				attempts: rowData.lifetime.attempts,
				total: {
					fish: rowData.lifetime.fish,
					junk: rowData.lifetime.junk,
					coins: rowData.lifetime.coins
				}
			};
		});

		WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	return Router;
})();
