const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../../utils/webutils.js");
const User = require("../../../modules/chat-data/user-alias.js");

module.exports = (function () {
	"use strict";

	const fetchAllCookieData = async () => await sb.Query.getRecordset(rs => rs
		.select("User_Alias.Name AS Username")
		.select("CONVERT(JSON_EXTRACT(Value, '$.total.eaten.daily'), INT) AS Eaten_Daily")
		.select("CONVERT(JSON_EXTRACT(Value, '$.total.eaten.received'), INT) AS Eaten_Received")
		.select("CONVERT(JSON_EXTRACT(Value, '$.total.donated'), INT) AS Donated")
		.select("CONVERT(JSON_EXTRACT(Value, '$.total.received'), INT) AS Received")
		.select("CONVERT(JSON_EXTRACT(Value, '$.legacy.daily'), INT) AS Legacy_Daily")
		.select("CONVERT(JSON_EXTRACT(Value, '$.legacy.received'), INT) AS Legacy_Received")
		.select("CONVERT(JSON_EXTRACT(Value, '$.legacy.donated'), INT) AS Legacy_Donated")
		.from("chat_data", "User_Alias_Data")
		.join("chat_data", "User_Alias")
		.where("Property = %s", "cookie")
		.where("Value IS NOT NULL")
	);

	/**
	 * @api {get} /bot/cookie/check/ Cookie - Specific user stats
	 * @apiName GetCookieStatus
	 * @apiDescription Get current Cookie status for a given user and also the cookie statistics
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiParam {string} user User name - mutually exclusive with id
	 * @apiParam {number} id Supibot user ID - mutually exclusive with user
	 * @apiSuccess {boolean} available Whether that user has a cookie available for today right now
	 * @apiSuccess {boolean} gifted If true, the user's cookie is gifted, and they cannot gift it again
	 * @apiSuccess {number} total Total amount of cookies consumed by the user
	 * @apiSuccess {Object} gifts Gifted cookie stats for given user
	 * @apiSuccess {number} gifts.sent Total amount of cookies gifted away
	 * @apiSuccess {number} gifts.received Total amount of cookies received as gifts
	 * @apiError (400) InvalidRequest Neither name and id have been provided<br>
	 * Both name and id have been provided<br>
	 * id has been provided but it's not a valid ID integer<br>
	 * User for given name/id does not exist<br>
	 */
	Router.get("/check", async (req, res) => {
		const { name, id: rawID } = req.query;
		if (!name && !rawID) {
			return WebUtils.apiFail(res, 400, "Must specify exactly one of name/id");
		}
		else if (name && rawID) {
			return WebUtils.apiFail(res, 400, "Must specify exactly one of name/id");
		}

		const id = Number(rawID);
		if (rawID && !sb.Utils.isValidInteger(id)) {
			return WebUtils.apiFail(res, 400, "id must be a valid ID integer");
		}

		const userID = await User.selectCustom(rs => rs
			.select("ID")
			.where({ condition: (name) }, "User_Alias.Name = %s", name)
			.where({ condition: (rawID) }, "User_Alias.ID = %n", id)
		);

		if (!userID) {
			return WebUtils.apiFail(res, 404, "User does not exist");
		}

		const cookieData = await sb.Query.getRecordset(rs => rs
			.select("Value")
			.from("chat_data", "User_Alias_Data")
			.where("Property = %s", "cookie")
			.where("User_Alias = %n", userID)
			.single()
			.limit(1)
		);

		if (!cookieData) {
			return WebUtils.apiSuccess(res, {});
		}
		else {
			return WebUtils.apiSuccess(res, JSON.parse(cookieData));
		}
	});

	/**
	 * @api {get} /bot/cookie/list/ Cookie - Total stats
	 * @apiName ListCookieStats
	 * @apiDescription Fetches cookie statistics for all users
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiSuccess {Object[]} data
	 * @apiSuccess {string} user
	 * @apiSuccess {Object} eaten
	 * @apiSuccess {number} eaten.daily
	 * @apiSuccess {number} eaten.received
	 * @apiSuccess {number} donated
	 * @apiSuccess {number} received
	 * @apiSuccess {Object} legacy
	 * @apiSuccess {number} legacy.daily
	 * @apiSuccess {number} legacy.donated
	 * @apiSuccess {number} legacy.received
	 */
	Router.get("/list", async (req, res) => {
		const cookieData = await fetchAllCookieData();
		const data = cookieData.map(i => ({
			user: i.Username,
			eaten: {
				daily: i.Eaten_Daily,
				received: i.Eaten_Received
			},
			donated: i.Donated,
			received: i.Received,
			legacy: {
				daily: i.Legacy_Daily,
				donated: i.Legacy_Donated,
				received: i.Legacy_Received
			}
		}));

		WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	Router.get("/list/client", async (req, res) => {
		const cookieData = await fetchAllCookieData();
		const data = cookieData.map(i => ({
			User: i.Username,
			Total: i.Eaten_Daily + i.Eaten_Received + i.Legacy_Daily + i.Legacy_Received,
			Daily: i.Eaten_Daily + i.Legacy_Daily,
			Donated: i.Donated + i.Legacy_Donated,
			Received: i.Received + i.Legacy_Received
		}));

		WebUtils.apiSuccess(res, data, {
			skipCaseConversion: true
		});
	});

	return Router;
})();
