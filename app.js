const importModule = async (module, path) => {
	const { crons, definitions } = await import(`${path}/index.mjs`);

	if (definitions) {
		await module.importData(definitions);
	}
	else if (crons) {
		sb.crons = crons;
	}
};

(async function () {
	"use strict";

	require("./db-access.js");

	const core = await import("supi-core");
	const Query = new core.Query({
		user: process.env.MARIA_USER,
		password: process.env.MARIA_PASSWORD,
		host: process.env.MARIA_HOST,
		connectionLimit: process.env.MARIA_CONNECTION_LIMIT
	});

	const configData = await Query.getRecordset(rs => rs
		.select("*")
		.from("data", "Config"));

	core.Config.load(configData);

	globalThis.sb = {
		Date: core.Date,
		Error: core.Error,
		Promise: core.Promise,

		Config: core.Config,
		Got: core.Got,

		Query,
		Cache: new core.Cache(core.Config.get("REDIS_CONFIGURATION")),
		// Metrics: new core.Metrics(),
		Utils: new core.Utils()
	};

	await Promise.all([
		importModule(sb.Got,"./crons"),
		importModule(sb.Got, "./gots")
	]);

	const WebUtils = require("./utils/webutils.js");
	const subroutes = [
		"api",
		"bot",
		"contact",
		"crypto-game",
		"cytube",
		"data",
		"gachi",
		"osrs",
		"relay",
		"restart",
		"rss",
		"stream",
		"teapot",
		"track",
		"user"
	];

	const port = 80;
	const bodyParser = require("body-parser");

	const Express = require("express");
	require("express-async-errors");

	const Session = require("express-session");
	const Passport = require("passport");
	const { OAuth2Strategy } = require("passport-oauth");
	// const CacheController = require("express-cache-controller");
	const MySQLStore = require("express-mysql-session")(Session);

	// methods `userProfile` is called internally to resolve the auth
	// noinspection JSUnusedGlobalSymbols
	class TwitchStrategy extends OAuth2Strategy {
		async userProfile (accessToken, done) {
			const response = await sb.Got("Helix", {
				url: "users",
				headers: {
					// Override the default Helix headers - this is login info strategy
					Authorization: `Bearer ${accessToken}`,
					"Client-ID": sb.Config.get("WEBSITE_TWITCH_CLIENT_ID")
				}
			});

			if (response.ok) {
				done(null, response.body);
			}
			else {
				done(response.body);
			}
		}
	}

	// methods `userProfile` is called internally to resolve the auth
	// noinspection JSUnusedGlobalSymbols
	class GithubStrategy extends OAuth2Strategy {
		async userProfile (accessToken, done) {
			const { statusCode, body } = await sb.Got("Global", {
				method: "GET",
				throwHttpErrors: false,
				url: "https://api.github.com/user",
				headers: {
					Authorization: `token ${accessToken}`,
					"Client-ID": sb.Config.get("WEBSITE_TWITCH_CLIENT_ID")
				},
				responseType: "json"
			});

			if (statusCode === 200) {
				done(null, body);
			}
			else {
				done(body);
			}
		}
	}

	/** @type {Express} */
	const app = Express();
	const qs = require("qs");
	app.set("query parser", (string) => {
		const result = qs.parse(string, {
			depth: 0,
			parseArrays: false, // doesn't actually affect top-level arrays

			plainObject: true
		});

		for (const key of Object.keys(result)) {
			const value = result[key];
			if (!Array.isArray(value)) {
				continue;
			}

			result[key] = value.join(",");
		}

		return result;
	});

	app.use(require("cookie-parser")());

	if (sb.Config.has("WEBSITE_SESSION_SECRET")) {
		app.use(Session({
			secret: sb.Config.get("WEBSITE_SESSION_SECRET", false),
			resave: false,
			saveUninitialized: true,
			cookie: {
				secure: false,
				maxAge: 30 * 864e5
			},
			store: new MySQLStore({
				user: process.env.MARIA_USER,
				host: process.env.MARIA_HOST,
				password: process.env.MARIA_PASSWORD,
				database: "supinic.com",
				schema: {
					tableName: "Session",
					columnNames: {
						session_id: "SID",
						expires: "Expires",
						data: "Data"
					}
				}
			})
		}));
	}
	else {
		console.warn("Config WEBSITE_SESSION_SECRET is not set up, login sessions are not available");
	}

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.enable("trust proxy");

	app.use("/public", Express.static(`${__dirname}/static/`, {
		etag: true,
		maxAge: "1 day",
		lastModified: true
	}));
	app.use("/static", Express.static(`${__dirname}/static/`, {
		etag: true,
		maxAge: "1 day",
		lastModified: true
	}));

	app.use("/api", Express.static(`${__dirname}/apidocs/`));

	// app.use(CacheController({
	// 	noCache: true
	// }));

	app.use(Passport.initialize({}));
	app.use(Passport.session({}));

	app.locals.navitems = [
		{
			name: "Supibot",
			items: [
				{ name: "FAQ", link: "data/faq/list" },
				{ name: "Request Supibot", link: "bot/request-bot/form" },
				{ name: "Run a Supibot command", link: "bot/command/run" },
				{ separator: true },
				{ name: "Cookie stats", link: "bot/cookie/list" },
				{ name: "Fishing stats", link: "bot/fish/list" },
				{ separator: true },
				{ name: "Aliases - find by user", link: "bot/user/alias/find" },
				{ name: "Channel list", link: "bot/channel/list" },
				{ name: "Commands", link: "bot/command/list" },
				{ name: "Emote origins", link: "data/origin/list" },
				{ name: "Polls", link: "bot/poll/list" },
				{ name: "Slots winners list", link: "data/slots-winner/leaderboard" },
				{ name: "Suggestions - active", link: "data/suggestion/list/active" },
				{ name: "Suggestions - inactive", link: "data/suggestion/list/resolved" },
				{ separator: true },
				{ name: "Bot stats", link: "bot/stats" },
				{ name: "Changelog", link: "data/changelog/list" },
				{ name: "Suggestion stats", link: "data/suggestion/stats" }
			]
		},
		{
			name: "Make-a-bot",
			items: [
				{ name: "Readme", link: "bot/channel-bots/readme" },
				{ name: "Bots", link: "bot/channel-bots/list" },
				{ name: "Badges", link: "bot/channel-bots/badges" },
				{ name: "Levels", link: "bot/channel-bots/levels" }
			]
		},
		{
			name: "Music",
			items: [
				{ name: "Gachi list", link: "track/gachi/list" },
				{ name: "Todo list", link: "track/todo/list" },
				{ name: "Favourites - find by user", link: "track/favourite/find" },

				{ separator: true },

				{ name: "Archives", link: "gachi/archive" },
				{ name: "Legacy list", link: "gachi/list" }
				// { name: "Add new", link: "add" },
				// { name: "Guidelines", link: "guidelines" },
				// { name: "Todo list", link: "todo" },
				// { name: "Resources", link: "resources" }
			]
		},
		{
			name: "Stream",
			items: [
				{ name: "Cooking streams", link: "stream/recipe/list" },
				{ name: "Cytube history", link: "cytube/video-request/history" },
				{ name: "TTS voices", link: "stream/tts" },
				{ name: "Playsounds", link: "stream/playsound/list" },
				{ name: "Stream games", link: "stream/game/list" },
				{ name: "Video request queue", link: "stream/song-request/queue" },
				{ name: "Video request history", link: "stream/song-request/history" }
			]
		},
		{
			name: "Other",
			items: [
				{ name: "Bad Apple!!", link: "data/bad-apple/list" },
				{ name: "DALL-E images", link: "data/dall-e/list" },
				{ name: "OSRS Raids 3 calculator", link: "osrs/toa/calculator" }
			]
		},
		{
			name: "API",
			items: [
				{ name: "Documentation", link: "api" },
				{ name: "Get API key", link: "user/auth-key" }
			]
		},
		{
			name: "Contact",
			link: "contact"
		}
	];
	app.locals.loginItems = [
		{ name: "Command aliases", link: "user/alias/list" },
		{ separator: true },
		{ name: "Reminders - active", link: "bot/reminder/list" },
		{ name: "Reminders - history", link: "bot/reminder/history" },
		{ separator: true },
		{ name: "Suggestions - active", link: "data/suggestion/user/list/active" },
		{ name: "Suggestions - resolved", link: "data/suggestion/user/list/resolved" },
		{ name: "Suggestion - stats", link: "data/suggestion/user/stats" },
		{ separator: true },
		{ name: "Data within Supibot", link: "user/data/list" },
		{ name: "Favourite tracks", link: "track/favourite/list" },
		{ name: "Github link", link: "auth/github" },
		{ separator: true },
		{ name: "Log out", link: "user/logout" }
	];

	app.set("query parser", "simple");
	app.set("view engine", "pug");

	// robots.txt - disallow everything
	app.get("/robots.txt", (req, res) => {
		res.type("text/plain");
		res.send("User-agent: *\nDisallow: /\n");
	});

	app.all("*", async (req, res, next) => {
		const routeType = (req.originalUrl.includes("api")) ? "API" : "View";
		const log = await WebUtils.logRequest(req, routeType);
		const requestLogSymbol = Symbol.for("request-log-symbol");

		req[requestLogSymbol] = log.insertId;
		res.header("X-Robots-Tag", "noindex, nofollow, nosnippet, noarchive, noimageindex");

		const blockedUserAgents = require("./blocked-user-agents.json");
		if (blockedUserAgents.includes(req.header("user-agent"))) {
			res.status(418).send("NOT OK");
			return;
		}

		if (!req.originalUrl.includes("api")) {
			const columnValues = Object.keys(req.query).filter(i => /column[\d\w]+/.test(i));
			if (columnValues.length !== 0) {
				app.locals.columnValues = columnValues.map(key => ({
					position: Number(key.match(/column(\d+)/)?.[1]) ?? null,
					title: key.replace(/_/g, " ").match(/column(\w+)/)?.[1] ?? null,
					value: req.query[key]
				}));
			}
			else {
				app.locals.columnValues = [];
			}

			app.locals.currentLocation = encodeURIComponent(req.originalUrl);
		}

		if (req.session.passport?.user?.source === "twitch") {
			const User = require("./modules/chat-data/user-alias.js");
			const data = req.session.passport.user.data[0];
			const userData = await User.getByName(data.login);
			if (!userData) {
				return res.status(401).render("error", {
					error: "202 Accepted",
					message: `Your Twitch account has not been seen by Supibot before. Make sure to send at least one message in a channel with Supibot before continuing. This page will automatically refresh in 30 seconds.`,
					extraScript: `window.onload = () => setTimeout(() => location.reload(), 30000);`
				});
			}

			res.locals.authUser = {
				login: data.login,
				display: data.display_name,
				id: data.id,
				image: data.profile_image_url,
				userData
			};
		}

		next();
	});

	app.get("/", async (req, res) => {
		let streamData = [];
		const requiredConfigs = ["TWITCH_OAUTH", "TWITCH_CLIENT_ID", "ADMIN_USER_ID"];

		if (requiredConfigs.every(config => sb.Config.has(config, true))) {
			const adminUserID = sb.Config.get("ADMIN_USER_ID");
			const streamResponse = await sb.Got("Helix", {
				url: "streams",
				searchParams: {
					user_id: adminUserID
				}
			});

			streamData = streamResponse.body.data ?? [];
		}

		const [stream] = streamData;
		res.render("index", {
			game: stream?.game_name || null, // when no game is set, the game field is an empty string - || operator accounts for this
			viewers: stream?.viewer_count ?? null
		});
	});

	for (const route of subroutes) {
		app.use(`/${route}`, require(`./routes/${route}`));
	}

	const availableTwitchConfigs = [
		sb.Config.has("WEBSITE_TWITCH_CLIENT_ID"),
		sb.Config.has("WEBSITE_TWITCH_CLIENT_SECRET"),
		sb.Config.has("WEBSITE_TWITCH_CALLBACK_URL")
	];

	if (availableTwitchConfigs.every(i => i === true)) {
		Passport.serializeUser((user, done) => done(null, user));
		Passport.deserializeUser((user, done) => done(null, user));
		Passport.use("twitch", new TwitchStrategy(
			{
				authorizationURL: "https://id.twitch.tv/oauth2/authorize",
				tokenURL: "https://id.twitch.tv/oauth2/token",
				clientID: sb.Config.get("WEBSITE_TWITCH_CLIENT_ID"),
				clientSecret: sb.Config.get("WEBSITE_TWITCH_CLIENT_SECRET"),
				callbackURL: sb.Config.get("WEBSITE_TWITCH_CALLBACK_URL")
				// state: true
			},
			(access, refresh, profile, done) => {
				profile.accessToken = access;
				profile.refreshToken = refresh;
				profile.source = "twitch";

				done(null, profile);
			}
		));

		app.get("/auth/twitch", (req, res, next) => {
			const { returnTo } = req.query;
			const state = (returnTo)
				? Buffer.from(JSON.stringify({ returnTo })).toString("base64")
				: undefined;

			const authenticator = Passport.authenticate("twitch", { scope: "", state });
			authenticator(req, res, next);
		});

		app.get(
			"/auth/twitch/callback",
			Passport.authenticate("twitch", { failureRedirect: "/wcs" }),
			async (req, res) => {
				try {
					const { state } = req.query;
					const { returnTo } = JSON.parse(Buffer.from(state, "base64").toString());
					if (typeof returnTo === "string" && returnTo.startsWith("/")) {
						return res.redirect(returnTo);
					}
				}
				catch {
					console.warn("Redirect not applicable", res);
				}

				res.redirect("/contact");
			}
		);
	}
	else {
		console.warn("Twitch auth configs are not set up, Twitch login is not available", {
			configs: ["WEBSITE_TWITCH_CLIENT_ID", "WEBSITE_TWITCH_CLIENT_SECRET", "WEBSITE_TWITCH_CALLBACK_URL"]
		});
	}

	const availableGithubConfigs = [
		sb.Config.has("WEBSITE_GITHUB_CLIENT_ID"),
		sb.Config.has("WEBSITE_GITHUB_CLIENT_SECRET"),
		sb.Config.has("WEBSITE_GITHUB_CALLBACK_URL")
	];

	if (availableGithubConfigs.every(i => i === true)) {
		Passport.use("github", new GithubStrategy(
			{
				authorizationURL: "https://github.com/login/oauth/authorize",
				tokenURL: "https://github.com/login/oauth/access_token",
				clientID: sb.Config.get("WEBSITE_GITHUB_CLIENT_ID"),
				clientSecret: sb.Config.get("WEBSITE_GITHUB_CLIENT_SECRET"),
				callbackURL: sb.Config.get("WEBSITE_GITHUB_CALLBACK_URL"),
				passReqToCallback: true
			},
			(req, access, refresh, profile, done) => {
				profile.accessToken = access;
				profile.refreshToken = refresh;
				profile.source = "github";

				req[Symbol.for("github-profile")] = { profile };

				done(null, profile);
			}
		));

		app.get("/auth/github", (req, res, next) => {
			const { userData } = res.locals.authUser ?? {};
			if (!userData) {
				return res.status(401).render("error", {
					message: "401 Unauthorized",
					error: "You must be logged first in order in to link your Github account"
				});
			}

			const authenticator = Passport.authenticate("github");
			authenticator(req, res, next);
		});

		app.get(
			"/auth/github/callback",
			Passport.authenticate("github",{ session: false }),
			async (req, res) => {
				const User = require("./modules/chat-data/user-alias.js");
				const { userData } = res.locals.authUser ?? {};
				if (!userData) {
					return res.status(401).render("error", {
						message: "401 Unauthorized",
						error: "You must be logged first in order in to link your Github account"
					});
				}

				const { profile } = req[Symbol.for("github-profile")];
				if (!profile) {
					throw new sb.Error({
						message: "No github profile available in callback",
						args: { req }
					});
				}

				const rawGithubData = await User.getDataProperty(userData.ID, "github");
				const githubData = (rawGithubData) ? JSON.parse(rawGithubData) : {};

				if (githubData.login === profile.login) {
					return res.render("generic", {
						data: sb.Utils.tag.trim `
							<div class="pt-3 text-center">
								<h4>Your user profile is already connected to this Github profile 🙂</h4>
							</div>
						`
					});
				}

				const previousString = (githubData)
					? `Your Twitch account was previously connected to ${githubData.login}.`
					: "";

				await User.setDataProperty(userData.ID, "github", JSON.stringify({
					created: new sb.Date(profile.created_at).valueOf(),
					login: profile.login,
					type: profile.type
				}));

				await sb.Got("Supibot", {
					url: "user/invalidateCache",
					searchParams: {
						name: userData.Name
					}
				});

				return res.render("generic", {
					data: sb.Utils.tag.trim `
					<div class="pt-3 text-center">
						<h4>Github connection completed succesfully!</h4>
						Connected Twitch user
						<a target="_blank" href="//twitch.tv/${userData.Name}">${userData.Name}</a>
						to Github user 
						<a target="_blank" href="//github.com/${profile.login}">${profile.login}</a>						
						${previousString}
					</div>
				`
				});
			}
		);
	}
	else {
		console.warn("Twitch auth configs are not set up, Twitch login is not available", {
			configs: ["WEBSITE_GITHUB_CLIENT_ID", "WEBSITE_GITHUB_CLIENT_SECRET", "WEBSITE_GITHUB_CALLBACK_URL"]
		});
	}

	// 4 params are required (next is unused) - express needs this to recognize the callback as middleware
	// noinspection JSUnusedLocalSymbols
	app.use(async (err, req, res, next) => {
		// first - manage URIErrors caused by malformed path params
		// this is not an error, so no error will be printed.
		if (err instanceof URIError) {
			if (req.path.includes("/api")) {
				res.set("Content-Type", "application/json");
				return WebUtils.apiFail(res, 400, "Malformed URI parameter(s)");
			}
			else {
				res.set("Content-Type", "text/html");
				return res.status(400).render("error", {
					message: "404 Not found",
					error: "Malformed URI - endpoint was not found"
				});
			}
		}

		console.error("Website error", { err, req, res });

		// In the case of "internal auth error" from Twitch - where the user clicks the "Redirect now" button
		// on the Twitch auth callback page, simply redirect to main page. I assume this error only happens
		// because the Passport module is trying to auth an already authed user, but I wasn't able to find any
		// more info about this specific scenario.
		if (req.url.includes("twitch/callback") && err?.name === "InternalOAuthError") {
			res.redirect("/");
			return;
		}

		const requestLogSymbol = Symbol.for("request-log-symbol");
		try {
			if (err instanceof OAuth2Strategy.AuthorizationError) {
				const insertId = await WebUtils.logError("View", err, req[requestLogSymbol]);

				res.set("Content-Type", "text/html");

				return res.status(401).render("error", {
					error: "401 Unauthorized",
					message: `Your authorization failed due to a third party error (error ID ${insertId})`
				});
			}
			else {
				let insertId;
				if (typeof err.message !== "string" || !err.message.includes("retrieve connection from pool timeout")) {
					insertId = await WebUtils.logError("View", err, req[requestLogSymbol]);
				}

				res.set("Content-Type", "text/html");
				return res.status(500).render("error", {
					error: "500 Internal Error",
					message: (insertId)
						? `Internal server error encountered (error ID ${insertId})`
						: `Internal server error encountered`
				});
			}
		}
		catch (e) {
			console.error("Error while trying to save error", e);

			res.set("Content-Type", "text/html");
			return res.status(500).render("error", {
				error: "500 Internal Error",
				message: `Internal server error`
			});
		}
	});
	// eslint-enable no-unused-vars

	// 404
	app.get("*", (req, res) => res.status(404).render("error", {
		message: "404 Not found",
		error: "Endpoint was not found"
	}));

	app.listen(port, () => console.log("Listening..."));

	sb.App = app;
	sb.App.data = {
		/** @type {Map<string, Object>} */
		deprecation: new Map()
	};
})();
