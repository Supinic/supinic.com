module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();
	const subroutes = [
		["bot", "bot"],
		["bot-program", "bot-program"],
		["data", "data"],
		["gachi", "gachi.js"],
		["text-normalize", "text-normalize.js"],
		["track", "track"],
		["trackData", "trackData.js"],
	];

	Router.all("/*", (req, res, next) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		res.header("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,DELETE,CONNECT,OPTIONS,TRACE,PATCH");

		sb.WebUtils.apiLogRequest(req);
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

	subroutes.forEach(([name, link]) => Router.use("/" + name, require("./" + link)));

	return Router;
})();
