module.exports = (function () {
	"use strict";

	const Express = require("express");
	const RateLimiter = require("express-rate-limit");
	const Router = Express.Router();
	const subroutes = [
		["bot", "bot"],
		["bot-program", "bot-program"],
		["crypto-game", "crypto-game"],
		["cytube", "cytube"],
		["data", "data"],
		["gachi", "gachi.js"],
		["osrs", "osrs.js"],
		["relay", "relay.js"],
		["test", "test.js"],
		["track", "track"],
		["trackData", "trackData.js"],
	];

	// Rate limit for API endpoints
	Router.use("/*", RateLimiter({
		max: 100,
		windowMs: 60_000,
		message: "Flood protection rate limit (100 requests/minute) exceeded!"
	}));

	Router.all("/*", (req, res, next) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		res.header("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,DELETE,CONNECT,OPTIONS,TRACE,PATCH");

		next();
	});

	Router.all("/*", (req, res, next) => {
		const { deprecation } = req.query;
		if (deprecation && sb.App.data.deprecation.has(deprecation)) {
			delete req.query.deprecation;
			req.session.deprecation = sb.App.data.deprecation.get(deprecation);
			sb.App.data.deprecation.delete(deprecation);
		}

		next();
	});

	/**
	 * @api {get} /endpoints Endpoints - List
	 * @apiName ListEndpoints
	 * @apiDescription Gets the dynamic list of all endpoints
	 * @apiGroup Meta
	 * @apiPermission none
	 * @apiSuccess {Object} endpoints
	 * @apiSuccess {string[]} endpoints.get List of all API GET endpoints
	 * @apiSuccess {string[]} endpoints.post List of all API POST endpoints
	 * @apiSuccess {string[]} endpoints.put List of all API PUT endpoints
	 * @apiSuccess {string[]} endpoints.delete List of all API DELETE endpoints
	 */
	Router.get("/endpoints", async (req, res) => {
		const endpoints = {GET: [], POST: [], PUT: [], DELETE: []};
		const check = (layer, subPath) => {
			if (Array.isArray(layer?.handle?.stack)) {
				for (const subLayer of layer.handle.stack) {
					check(subLayer, subPath + "/" + layer.regexp.toString().match(/[\w\-]+/)[0]);
				}
			}
			else if (layer.route && !["*", "/*", "/robots.txt"].includes(layer.route.path)) {
				for (const method of Object.keys(layer.route.methods)) {
					endpoints[method.toUpperCase()].push(subPath + layer.route.path);
				}
			}
		};

		const apiLayer = sb.App._router.stack.find(i => i.regexp.toString().includes("api") && i.name.includes("router"));
		for (const layer of apiLayer.handle.stack) {
			check(layer, "");
		}

		for (const array of Object.values(endpoints)) {
			array.sort();
		}

		sb.WebUtils.apiSuccess(res, endpoints);
	});

	for (const [route, file] of subroutes) {
		Router.use("/" + route, require("./" + file));
	}

	// next param is required - Express recognizes four parameters functions as middlewares
	// noinspection JSUnusedLocalSymbols
	Router.use(async (err, req, res, next) => {
		const errorID = await sb.SystemLogger.sendError("Website - API", err);
		return sb.WebUtils.apiFail(res, 500, err.message, { ID: errorID });
	});

	Router.all("*", (req, res) => {
		return sb.WebUtils.apiFail(res, 404, "Not found");
	});

	return Router;
})();
