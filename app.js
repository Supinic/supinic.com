(async function () {
	"use strict";

	process.env.PROJECT_TYPE = "site";

	require("./db-access.js");
	await require("supi-core")("sb", {
		whitelist: [
			"objects/date",
			"objects/error",
			"objects/promise",
			"objects/url-params",

			"singletons/query",
			"classes/config",
			"singletons/utils",
			"singletons/internal-request",
			"singletons/system-log",

			"classes/got",
			"classes/user",
			"classes/cron",
			"classes/reminder"
		],

		skipData: [
			"classes/reminder"
		]
	});

	// Todo move WebUtils into globals package
	sb.WebUtils = require("./webutils");

	const subRoutes = [
		"api",
		"bot",
		"contact",
		"cytube",
		"data",
		"gachi",
		"rss",
		"stream",
		"teapot",
		"track",
		"user",
		"wow"
	];

	const port = 80;
	const bodyParser = require("body-parser");

	const Express = require("express");
	require("express-async-errors");

	const Session = require("express-session");
	const Passport = require("passport");
	const { OAuth2Strategy } = require("passport-oauth");
	const CacheController = require("express-cache-controller");
	const MySQLStore = require("express-mysql-session")(Session);

	class TwitchStrategy extends OAuth2Strategy {
		async userProfile (accessToken, done, ...rest) {
			const { statusCode, body } = await sb.Got({
				method: "GET",
				throwHttpErrors: false,
				url: "https://api.twitch.tv/helix/users",
				headers: {
					Authorization: "Bearer " + accessToken,
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

	class GithubStrategy extends OAuth2Strategy {
		async userProfile (accessToken, done) {
			const { statusCode, body } = await sb.Got({
				method: "GET",
				throwHttpErrors: false,
				url: "https://api.github.com/user",
				headers: {
					Authorization: "token " + accessToken,
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

	const app = Express();
	app.use(require("cookie-parser")());
	app.use(Session({
		secret: sb.Config.get("WEBSITE_SESSION_SECRET", false),
		resave: false,
		saveUninitialized: true,
		cookie: {
			secure: false,
			maxAge: 24 * 60 * 60 * 1000
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

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));

	app.use("/public", Express.static(__dirname + "/public/", {
		etag: true,
		maxAge: "1 day",
		lastModified: true
	}));

	app.use(CacheController({
		noCache: true
	}));

	app.use(Passport.initialize());
	app.use(Passport.session());
	
	Passport.serializeUser((user, done) => done(null, user));
	Passport.deserializeUser((user, done) => done(null, user));
	Passport.use("twitch", new TwitchStrategy(
		{
			authorizationURL: "https://id.twitch.tv/oauth2/authorize",
			tokenURL: "https://id.twitch.tv/oauth2/token",
			clientID: sb.Config.get("WEBSITE_TWITCH_CLIENT_ID"),
			clientSecret: sb.Config.get("WEBSITE_TWITCH_CLIENT_SECRET"),
			callbackURL: sb.Config.get("WEBSITE_TWITCH_CALLBACK_URL"),
			// state: true
		},
		(access, refresh, profile, done) => {
			profile.accessToken = access;
			profile.refreshToken = refresh;
			profile.source = "twitch";

			done(null, profile);
		}
	));
	Passport.use("github", new GithubStrategy(
		{
			authorizationURL: "https://github.com/login/oauth/authorize",
			tokenURL: "https://github.com/login/oauth/access_token",
			clientID: sb.Config.get("WEBSITE_GITHUB_CLIENT_ID"),
			clientSecret: sb.Config.get("WEBSITE_GITHUB_CLIENT_SECRET"),
			callbackURL: sb.Config.get("WEBSITE_GITHUB_CALLBACK_URL"),
		},
		(access, refresh, profile, done) => {
			profile.accessToken = access;
			profile.refreshToken = refresh;
			profile.source = "github";

			done(null, profile);
		}
	));

	app.locals.navitems = [
		{
			name: "Supibot",
			items: [
				{ name: "Request Supibot", link: "bot/request-bot/form" },
				{ separator: true },
				{ name: "Channel list", link: "bot/channel/list" },
				{ name: "Commands", link: "bot/command/list" },
				{ name: "Commands statistics", link: "bot/command/stats" },
				{ name: "Emote origins", link: "data/origin/list" },
				{ name: "Slots winners list", link: "bot/slots-winner/list" },
				{ name: "Suggestions - all", link: "data/suggestion/list" },
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
				{ name: "Legacy list", link: "gachi/list" },
				// { name: "Add new", link: "add" },
				// { name: "Guidelines", link: "guidelines" },
				// { name: "Todo list", link: "todo" },
				// { name: "Resources", link: "resources" }
			]
		},
		{
			name: "Stream",
			items: [
				{ name: "Cytube history", link: "cytube/video-request/history" },
				{ name: "TTS voices", link: "stream/tts" },
				{ name: "Playsounds", link: "stream/playsound/list" },
				{ name: "Video request queue", link: "stream/song-request/queue" },
				{ name: "Video request history", link: "stream/song-request/history" }
			]
		},
		{
			name: "API",
			items: [
				{ name: "Documentation", link: "api" },
				{ name: "Get API key", link: "user/auth-key"}
			]
		},
		{
			name: "Contact",
			link: "contact"
		}
	];
	app.locals.loginItems = [
		{ name: "Command aliases", link: "user/alias/list" },
		{ name: "Favourite tracks", link: "track/favourite/list" },
		{ name: "Reminders", link: "bot/reminder/list" },
		{ name: "Suggestion stats", link: "data/suggestion/stats" },

		{ separator: true },

		{ name: "Log out", link: "user/logout" },
	];

	app.set("view engine", "pug");
	
	// robots.txt - disallow everything
	app.get("/robots.txt", (req, res) => {
		res.type("text/plain");
		res.send("User-agent: Googlebot\nAllow: /\nUser-Agent: *\nDisallow: /");
	});

	app.get("/favicon.ico", (req, res) => {
		res.redirect("/public/img/hackerman.gif");
	});

	await app.all("*", async (req, res, next) => {
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

			app.locals.currentLocation = req.originalUrl;
		}

		if (req.session.passport?.user?.source === "twitch") {
			const data = req.session.passport.user.data[0];

			sb.User.data.delete(data.login);
			const userData = await sb.User.get(data.login, false);

			res.locals.authUser = {
				login: data.login,
				display: data.display_name,
				id: data.id,
				image: data.profile_image_url,
				admin: data.login === "supinic",
				userData
			};

			res.locals.level = {
				isLogin: () => true,
				isEditor: () => Boolean(userData.Data.trackEditor || userData.Data.trackModerator || userData.Data.trackAdmin),
				isModerator: () => Boolean(userData.Data.trackModerator || userData.Data.trackAdmin),
				isAdmin: () => Boolean(userData.Data.trackAdmin),
			}
		}

		next();
	});

	app.get("/", (req, res) => res.render("index"));
	for (const route of subRoutes) {
		app.use("/" + route, require("./routes/" + route));
	}

	// Twitch auth
	app.get("/auth/twitch", (req, res, next) => {
		const { returnTo } = req.query;
		const state = (returnTo)
			? Buffer.from(JSON.stringify({returnTo})).toString("base64")
			: undefined;

		const authenticator = Passport.authenticate("twitch", { scope: "", state });
		authenticator(req, res, next);
	});

	app.get("/auth/twitch/callback", Passport.authenticate("twitch", { failureRedirect: "/wcs" }), async (req, res) => {
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
	});

	app.get("/auth/github", (req, res, next) => {
		const { returnTo } = req.query;
		const state = (returnTo)
			? Buffer.from(JSON.stringify({returnTo})).toString("base64")
			: undefined;

		const authenticator = Passport.authenticate("github", { scope: "", state });
		authenticator(req, res, next);
	});

	app.get("/auth/github/callback", Passport.authenticate("github", {
		session: false,
		successRedirect: "/auth/github/success",
		failureRedirect: "/auth/github/fail"
	}));

	app.use(async (err, req, res, next) => {
		console.error("Website error", err, req);

		try {
			const errorID = await sb.SystemLogger.sendError("Website", err);
			return res.status(500).render("error", {
				error: "500 Internal Error",
				message: `Internal error encountered (ID ${errorID})`
			});
		}
		catch (e) {
			console.error("Error while trying to save error", e);
			return res.status(500).render("error", {
				error: "500 Internal Error",
				message: `Internal server error`
			});
		}
	});

	// 404
	app.get("*", (req, res) => {
		return res.status(404).render("error", {
			message: "404 Not found",
			error: "Endpoint was not found"
		});
	});

	app.listen(port, () => console.log("Listening..."));

	sb.App = app;
	sb.App.cache = {};
	sb.App.data = {
		/** @type {Map<string, Object>} */
		deprecation: new Map()
	};
})();	