const User = require("../modules/chat-data/user-alias.js");

const sanitizeObjectBigint = (data) => {
	const outputData = {};
	for (const [key, value] of Object.entries(data)) {
		if (typeof value === "bigint") {
			if (String(Number(value)) !== String(value)) {
				throw new sb.Error({
					message: "Cannot serve bigint as number",
					args: {
						bigintValue: String(value),
						convertedValue: String(Number(value))
					}
				});
			}

			outputData[key] = Number(value);
		}
		else {
			outputData[key] = value;
		}
	}

	return outputData;
};

module.exports = class WebUtils {
	static #localRequests = new Map();
	static #requestMessages = {
		400: "Bad Request",
		401: "Unauthorized",
		403: "Forbidden",
		404: "Not Found",
		500: "Internal Server Error"
	};

	static get levels () {
		return {
			none: 1,
			login: 10,
			editor: 100,
			admin: 1000
		};
	}

	/**
	 * Returns response in the standardized format for all API errors.
	 * @param {Express.response} res
	 * @param {number} code = 500
	 * @param {string} message = "Unknown error"
	 * @param {Object} data = {}
	 */
	static apiFail (res, code = 500, message = "Unknown error", data = null) {
		if (!res || typeof res.type !== "function") {
			throw new TypeError("Argument res must provided and be Express result");
		}
		const responseData = {
			statusCode: code,
			timestamp: new Date().valueOf(),
			data: null,
			error: {
				message,
				data: sanitizeObjectBigint(data)
			}
		};

		if (res.req.session.deprecation) {
			responseData.deprecation = res.req.session.deprecation;
		}

		return res.type("application/json")
			.status(code)
			.send(JSON.stringify(responseData));
	}

	/**
	 * Returns response in the standardized format for all API successes.
	 * @param {Express.response} res
	 * @param {Object} data = {}
	 * @param {Object} options = {}
	 * @param {boolean} [options.skipCaseConversion] If true, no data object keys will be case-converted
	 */
	static apiSuccess (res, data = {}, options = {}) {
		if (!res || typeof res.type !== "function") {
			throw new TypeError("Argument res must provided and be Express result");
		}

		let outputData = sanitizeObjectBigint(data);
		if (outputData && !options.skipCaseConversion) {
			outputData = sb.Utils.convertCaseObject(data, "snake", "camel");
		}

		const responseData = {
			statusCode: 200,
			timestamp: new Date().valueOf(),
			data: outputData,
			error: null
		};

		if (res.req.session.deprecation) {
			responseData.deprecation = res.req.session.deprecation;
		}

		return res.type("application/json")
			.status(200)
			.send(JSON.stringify(responseData));
	}

	/**
	 * Handles deprecation of an API(!) endpoint by redirecting and setting session data with deprecation info.
	 * Additionally, if the endpoint has retired (based on timestamp), returns 410 instead.
	 * @param {Express.request} req
	 * @param {Express.response} res
	 * @param {Object} options = {}
	 */
	static async apiDeprecated (req, res, options) {
		const { original, replacement, timestamp = null } = options;
		if (timestamp !== null && sb.Date.now() > timestamp) {
			res.statusMessage = "ppPoof";
			return res.type("application/json")
				.status(410)
				.send(JSON.stringify({
					status: "Endpoint retired",
					retirement: timestamp,
					replacement
				}));
		}

		const key = sb.Utils.randomString(8);
		sb.App.data.deprecation.set(key, {
			active: true,
			original,
			replacement,
			notice: `Endpoint "${original}" is deprecated, please use "${replacement}" instead at your own convenience`,
			retirement: timestamp
		});

		const { parse, stringify } = require("querystring");
		const obj = parse(res.req._parsedOriginalUrl.query);
		obj.deprecation = key;

		res.redirect(`${replacement}?${stringify(obj)}`);
	}

	/**
	 * @param {number} statusCode
	 * @returns {string}
	 */
	static formatErrorMessage (statusCode) {
		const message = WebUtils.#requestMessages[statusCode];
		return (message)
			? `${statusCode} ${message}`
			: `${statusCode} - other error`;
	}

	/**
	 * Handles a request's error response
	 * @param {Express.response} res
	 * @param {number} statusCode
	 * @param {string} [message]
	 * @returns {Express.response}
	 */
	static handleError (res, statusCode, message) {
		return res.status(statusCode).render("error", {
			error: WebUtils.formatErrorMessage(statusCode),
			message: message ?? "(no error message)"
		});
	}

	/**
	 * Determines whether or not a provided user ID has been globally banned from the projects.
	 * @param {number} userID
	 * @returns {Promise<boolean>}
	 */
	static async checkGlobalUserBan (userID) {
		const check = await sb.Query.getRecordset(rs => rs
			.select("ID")
			.from("chat_data", "Filter")
			.where("User_Alias = %n", userID)
			.where("Active = %b", true)
			.where("Type = %s", "Blacklist")
			.where("Command IS NULL")
			.where("Channel IS NULL")
			.where("Platform IS NULL")
			.single()
			.flat("ID")
		);

		return Boolean(check);
	}

	/**
	 * Parses out user authentication and returns an object containing the level, or an error
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Object} options = {}
	 * @param {boolean} [options.ignoreGlobalBan]
	 * @returns Promise<UserLevelResult>
	 */
	static async getUserLevel (req, res, options = {}) {
		if (req.query.auth_key && req.query.auth_user) {
			let userData;
			const userID = Number(req.query.auth_user);
			if (!sb.Utils.isValidInteger(userID)) {
				userData = await User.getByName(req.query.auth_user);
			}
			else {
				userData = await User.getByID(userID);
			}

			if (!userData) {
				return { error: "User identifier (query) is not valid a valid ID number" };
			}

			const authKey = await User.getDataProperty(userData.ID, "authKey");
			if (!authKey || authKey !== req.query.auth_key) {
				return {
					error: "Access denied",
					errorCode: 401
				};
			}

			const banned = await WebUtils.checkGlobalUserBan(userData.ID);
			if (banned && !options.ignoreGlobalBan) {
				return {
					error: "Access revoked",
					errorCode: 403
				};
			}

			const level = await User.getDataProperty(userData.ID, "trackLevel");
			return {
				banned,
				level: level ?? "login",
				userID: userData.ID,
				userData
			};
		}
		else if (req.header("Authorization")) {
			const [type, key] = req.header("Authorization").split(" ");
			if (type !== "Basic" || !key) {
				return {
					error: "Invalid Authorization header, must use \"Basic (user):(key)\"",
					errorCode: 400
				};
			}

			const [userIdentifier, authKey] = key.split(":");
			const userID = Number(userIdentifier);
			if (!sb.Utils.isValidInteger(userID)) {
				return {
					error: "User identifier (header) is not a valid ID number",
					errorCode: 400
				};
			}

			const userData = await User.getByID(userID);
			if (!userData) {
				return {
					error: "Authorized user does not exist",
					errorCode: 400
				};
			}

			const storedAuthKey = await User.getDataProperty(userData.ID, "authKey");
			if (!storedAuthKey || storedAuthKey !== authKey) {
				return {
					error: "Access denied",
					errorCode: 401
				};
			}

			const banned = await WebUtils.checkGlobalUserBan(userData.ID);
			if (banned && !options.ignoreGlobalBan) {
				return {
					error: "Access revoked",
					errorCode: 403
				};
			}

			const level = await User.getDataProperty(userData.ID, "trackLevel");
			return {
				banned,
				level: level ?? "login",
				userID: userData.ID,
				userData
			};
		}
		else if (req.query.localRequestAuthUser) {
			const userID = Number(req.query.localRequestAuthUser);
			if (!WebUtils.#localRequests.get(userID)) {
				console.error("Invalid local request attempt", { req, userID });
				return {
					error: "Invalid local request attempt",
					errorCode: 401
				};
			}

			WebUtils.#localRequests.delete(userID);

			const userData = await User.getByID(userID);
			if (!userData) {
				return {
					level: "none",
					userID: null
				};
			}

			const banned = await WebUtils.checkGlobalUserBan(userData.ID);
			if (banned && !options.ignoreGlobalBan) {
				return {
					error: "Access revoked",
					errorCode: 403
				};
			}

			const level = await User.getDataProperty(userData.ID, "trackLevel");
			return {
				banned,
				level: level ?? "login",
				userID: userData.ID,
				userData
			};
		}
		else if (!res.locals) {
			return {
				error: "Session timed out",
				errorCode: 440
			};
		}
		else if (!res.locals.authUser || !res.locals.authUser.userData) {
			return {
				level: "none",
				userID: null,
				userData: null
			};
		}
		else {
			const level = await User.getDataProperty(res.locals.authUser.userData.ID, "trackLevel");
			return {
				level: level ?? "login",
				userID: res.locals.authUser.userData.ID,
				userData: res.locals.authUser.userData
			};
		}
	}

	/**
	 * Compares two levels and returns whether they have access
	 * @param {string} actual
	 * @param {string} required
	 * @returns {boolean}
	 */
	static compareLevels (actual, required) {
		if (!WebUtils.levels[actual] || !WebUtils.levels[required]) {
			throw new TypeError(`Invalid level(s): "${actual}", "${required}"`);
		}

		return WebUtils.levels[actual] >= WebUtils.levels[required];
	}

	/**
	 * Authorizes a local API request that requires authentication
	 * @param {number} userID
	 * @param {URLSearchParams} [params]
	 * @returns {URLSearchParams}
	 */
	static authenticateLocalRequest (userID, params) {
		WebUtils.#localRequests.set(userID, true);

		if (params && !(params instanceof URLSearchParams)) {
			throw new sb.Error({
				message: "If provided, params object must be an instance of URLSearchParams"
			});
		}

		const resultParams = params ?? new URLSearchParams();
		resultParams.set("localRequestAuthUser", String(userID));

		return resultParams;
	}

	/**
	 * Turns links in text into HTML clickable links.
	 * @param {string} string
	 * @param {Object} [options]
	 * @param {string} [options.rel]
	 * @param {string} [options.target]
	 * @param {string} [options.replacement]
	 * @returns {string}
	 */
	static linkify (string, options = {}) {
		if (typeof string !== "string") {
			return options.replacement ?? "N/A";
		}

		const target = (options.target) ? `target="${options.target}"` : "";
		const rel = (options.rel) ? `rel="${options.rel}"` : "";

		return string
			.replaceAll(/(&lt;|<)(http?s:\/\/\S+)(&gt;|>)/g, "$2")
			.replaceAll(/(https?:\/\/\S+)/g, `<a class="linkified" href="$1" ${target} ${rel}>$1</a>`);
	}

	static async logRequest (req, route) {
		const row = await sb.Query.getRow("supinic.com", "Log");
		row.setValues({
			Method: req.method,
			Route: route,
			Endpoint: req.baseUrl + req.url,
			Source_IP: `${req.header("X-Forwarded-For")} (${req.connection.remoteAddress})`,
			User_Agent: req.header("User-Agent") || null,
			Headers: JSON.stringify(req.headers),
			Query: JSON.stringify(req.query),
			Body: JSON.stringify(req.body)
		});

		return await row.save();
	}

	static async loadVideoTypes () {
		if (WebUtils.videoTypes) {
			return;
		}

		const data = await sb.Query.getRecordset(rs => rs
			.select("*")
			.from("data", "Video_Type")
		);

		WebUtils.videoTypes = Object.fromEntries(data.map(i => [i.ID, { ...i }]));
	}

	/**
	 * Logs error based on an Error compatible object
	 * @param {"API"|"View"} type
	 * @param {Error} err
	 * @param {number} [requestID]
	 * @returns {Promise<number>}
	 */
	static async logError (type, err, requestID) {
		const row = await sb.Query.getRow("supinic.com", "Error");
		row.setValues({
			Type: "View",
			Request_ID: requestID ?? null,
			Message: err?.message ?? null,
			Stack: err?.stack ?? null
		});

		const result = await row.save();
		return result.insertId;
	}

	static parseVideoLink (type, link) {
		const videoTypePrefix = sb.Config.get("VIDEO_TYPE_REPLACE_PREFIX");
		const fullVideoType = WebUtils.videoTypes[type];

		if (!fullVideoType) {
			throw new sb.Error({
				message: "Unrecognized video type"
			});
		}
		else if (!fullVideoType.Link_Prefix) {
			throw new sb.Error({
				message: "Provided type does not have a link prefix"
			});
		}

		return fullVideoType.Link_Prefix.replace(videoTypePrefix, link);
	}
};

/**
 * @typedef {Object} UserLevelResult
 * @property {string} [error] If set, an error was encountered during authentication and the endpoint should abort
 * @property {number|null} [userID] If set, holds the authenticated user's ID
 * @property {UserData|null} [userData] If set, holds the authenticated user's database row data
 * @property {string} [level] If set, the request was authenticated properly
 */

/**
 * @typedef {Object} UserData
 * @property {number} ID
 * @property {string} Name
 * @property {string|null} Twitch_ID
 * @property {string|null} Discord_ID
 */
