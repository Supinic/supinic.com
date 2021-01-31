module.exports = class WebUtils {
	#localRequests = new Map();

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
				data
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
	 */
	static apiSuccess (res, data = {}) {
		if (!res || typeof res.type !== "function") {
			throw new TypeError("Argument res must provided and be Express result");
		}

		const responseData = {
			statusCode: 200,
			timestamp: new Date().valueOf(),
			data: (data)
				? sb.Utils.convertCaseObject(data, "snake", "camel")
				: data,
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
	static async apiDeprecated (req, res,  options) {
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
	 * @returns Promise<UserLevelResult>
	 */
	static async getUserLevel (req, res) {
		if (req.query.auth_key && req.query.auth_user) {
			const userData = await sb.User.get(Number(req.query.auth_user));
			if (!userData) {
				return { error: "User identifier (query) is not valid a valid ID number" };
			}
			else if (!userData.Data.authKey || userData.Data.authKey !== req.query.auth_key) {
				return {
					error: "Access denied",
					errorCode: 401
				};
			}

			const banned = await WebUtils.checkGlobalUserBan(userData.ID);
			if (banned) {
				return {
					error: "Access revoked",
					errorCode: 403
				};
			}

			return {
				level: userData.Data.trackLevel || "login",
				userID: userData.ID
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
			const userData = await sb.User.get(Number(userIdentifier));

			if (!userData) {
				return {
					error: "User identifier (header) is not a valid ID number",
					errorCode: 400
				};
			}
			else if (!authKey || userData.Data.authKey !== authKey) {
				return {
					error: "Access denied",
					errorCode: 401
				};
			}

			const banned = await WebUtils.checkGlobalUserBan(userData.ID);
			if (banned) {
				return {
					error: "Access revoked",
					errorCode: 403
				};
			}

			return {
				level: userData.Data.trackLevel || "login",
				userID: userData.ID
			};
		}
		else if (req.params.localRequestAuthUser) {
			const path = req.baseUrl + req.url + ":" + req.params.localRequestAuthUser;
			if (!WebUtils.#localRequests.get(path)) {
				console.error("Invalid local request attempt", { req, path });
				return {
					error: "Invalid local request attempt",
					errorCode: 401
				};
			}

			WebUtils.#localRequests.delete(path);

			const userData = await sb.User.get(req.params.localRequestAuthUser);
			if (!userData) {
				return {
					level: "none",
					userID: null
				};
			}

			const banned = await WebUtils.checkGlobalUserBan(userData.ID);
			if (banned) {
				return {
					error: "Access revoked",
					errorCode: 403
				};
			}

			return {
				level: userData.Data.trackLevel || "login",
				userID: userData.ID
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
				userID: null
			};
		}
		else {
			return {
				level: res.locals.authUser.userData.Data.trackLevel || "login",
				userID: res.locals.authUser.userData.ID
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

	static authenticateLocalRequest (req, userID) {
		const path = req.baseUrl + req.url + ":" + userID;
		WebUtils.#localRequests.set(path, true);
	}

	static async apiLogRequest (req) {
		const row = await sb.Query.getRow("api", "Log");
		row.setValues({
			Method: req.method,
			Endpoint: req.baseUrl + req.url,
			Source_IP: req.header("X-Forwarded-For") + " (" + req.connection.remoteAddress + ")",
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

		WebUtils.videoTypes = Object.fromEntries(data.map(i => [i.ID, {...i}]));
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

	static async invalidateBotCache (options = {}) {
		let params = null;
		switch (options.type) {
			case "afk": {
				params = new sb.URLParams().set("type", "reload").set("module", "afk");
				break;
			}

			case "channel": {
				params = new sb.URLParams().set("type", "reload").set("module", "channel");
				break;
			}

			case "reminder": {
				params = new sb.URLParams().set("type", "reload").set("module", "reminder");
				break;
			}

			case "user": {
				if (typeof options.username !== "string") {
					throw new sb.Error({
						message: "Name must be passed as options.name to invalidate the user cache",
						args: { options }
					});
				}

				params = new sb.URLParams()
					.set("type", "reload")
					.set("module", "user")
					.set("username", options.username);

				break;
			}

			default: throw new sb.Error({
				message: "Invalid bot cache type provided",
				args: { options }
			});
		}

		await sb.InternalRequest.send(params);
	};
};

/**
 * @typedef {Object} UserLevelResult
 * @property {string} [error] If set, an error was encountered during authentication and the endpoint should abort
 * @property {number|null} [userID] If set, hold the authenticated user's ID
 * @property {string} [level] If set, the request was authenticated properly
 */