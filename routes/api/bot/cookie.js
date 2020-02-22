module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const ExtraUserData = require("../../../modules/chat-data/extra-user-data");

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
		const {name, id: rawID} = req.query;
		if (!name && !rawID) {
			return sb.WebUtils.apiFail(res, 400, "Must specify exactly one of name/id");
		}
		else if (name && rawID) {
			return sb.WebUtils.apiFail(res, 400, "Must specify exactly one of name/id");
		}

		const id = Number(rawID);
		if (rawID && !sb.Utils.isValidInteger(id)) {
			return sb.WebUtils.apiFail(res, 400, "id must be a valid ID integer");
		}

		const userData = await sb.User.get(name || id);
		if (!userData) {
			return sb.WebUtils.apiFail(res, 400, "User does not exist");
		}

		const extraData = (await ExtraUserData.selectSingleCustom(q => q
			.where("User_Alias = %n", userData.ID)
		)) || {Cookie_Today: false};

		return sb.WebUtils.apiSuccess(res, {
			available: !extraData.Cookie_Today,
			gifted: extraData.Cookie_Is_Gifted || false,
			total: extraData.Cookies_Total || 0,
			gifts: {
				sent: extraData.Cookie_Gifts_Sent || 0,
				received: extraData.Cookie_Gifts_Received || 0
			}
		});
	});

	/**
	 * @api {get} /bot/cookie/list/ Cookie - Total stats
	 * @apiName ListCookieStats
	 * @apiDescription Gets a total list of all cookies eaten, grouped by each user
	 * @apiGroup Bot
	 * @apiPermission any
	 * @apiSuccess {Object[]} data
	 * @apiSuccess {string} user If true, the user's cookie is gifted, and they cannot gift it again
	 * @apiSuccess {number} total Total amount of cookies consumed by the user
	 * @apiSuccess {number} daily Daily cookies eaten
	 * @apiSuccess {number} gifted Total amount of cookies gifted away
	 * @apiSuccess {number} received Total amount of cookies received as gifts
	 */
	Router.get("/list", async (req, res) => {
		const rawData = await ExtraUserData.list();
		const data = rawData.map(i => {
			const total = i.Cookies_Total + i.Cookie_Gifts_Received - i.Cookie_Gifts_Sent + i.Cookie_Today;
			const daily = i.Cookies_Total - i.Cookie_Gifts_Sent;
			return {
				User: i.Name,
				Total: (total < 0) ? 0 : total,
				Daily: (daily < 0) ? 0 : daily,
				Gifted: i.Cookie_Gifts_Sent,
				Received: i.Cookie_Gifts_Received
			};
		});

		sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();