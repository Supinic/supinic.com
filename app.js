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

	const port = 80;
	const crypto = require("crypto");
	const bodyParser = require("body-parser");

	const Express = require("express");
	require("express-async-errors");

	const Session = require("express-session");
	const Passport = require("passport");
	const { OAuth2Strategy } = require("passport-oauth");
	const CacheController = require("express-cache-controller");
	const MemoryStore = require("memorystore")(Session);

	class Strategy extends OAuth2Strategy {
		userProfile (accessToken, done) {
			sb.Got.instances.Twitch.Helix({
				url: "users",
				method: "GET",
				headers: {
					Authorization: "Bearer " + accessToken
				}
			}).then(({ body, statusCode }) => {
				if (statusCode === 200) {
					done(null, body);
				}
				else {
					done(body);
				}
			});
		}
	}

	
	const app = Express();
	app.use(Session({
		secret: crypto.randomBytes(16).toString(), // SESSION_SECRET
		resave: false,
		saveUninitialized: false,
		store: new MemoryStore({ checkPeriod: 36.0e5 }),
	}));

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));

	app.use("/public", Express.static(__dirname + "/public/", {
		etag: true,
		maxAge: "1 day",
		lastModified: true
	}));

	app.use("/api", Express.static(__dirname + "/apidocs/"));

	app.use(CacheController({
		noCache: true
	}));

	app.use(Passport.initialize());
	app.use(Passport.session());
	
	Passport.serializeUser((user, done) => done(null, user));
	Passport.deserializeUser((user, done) => done(null, user));
	Passport.use("twitch", new Strategy(
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
			// @todo Store user?
			done(null, profile);
		}
	));

	app.locals.navitems = [
		{
			name: "Chat bot",
			link: "bot",
			items: [
				{ name: "Channel list", link: "channel/list" },
				{ name: "Cookie statistics", link: "cookie/list" },
				{ name: "Commands", link: "command" },
				{ name: "Commands statistics", link: "command/stats" },
				{ name: "Reminders - yours", link: "reminder/list" },
				{ name: "Slots winners list", link: "slots-winner/list" },
				{ name: "Suggestions - all", link: "suggestions/list" },
				{ name: "Suggestions - yours", link: "suggestions/mine" },
				{ name: "Suggestions - your stats", link: "suggestions/stats" }
			]
		},
		{
			name: "Channel bots",
			link: "bot",
			items: [
				{ name: "Program info", link: "channel-bots" },
				{ name: "Bots", link: "channel-bots" },
				{ name: "Badges", link: "channel-bots/badges" },
				{ name: "Levels", link: "channel-bots/levels" }
			]
		},

		{
			name: "Data",
			link: "data",
			items: [
				{ name: "Emote origins", link: "origin/list" },
			]
		},
		{
			name: "Gachi",
			link: "gachi",
			items: [
				{ name: "List", link: "list" },
				// { name: "Add new", link: "add" },
				// { name: "Guidelines", link: "guidelines" },
				// { name: "Todo list", link: "todo" },
				{ name: "Archive", link: "archive" },
				{ name: "Resources", link: "resources" }
			]
		},
		{
			name: "Tracks",
			link: "track",
			items: [
				{ name: "Favourites", link: "favourite/list" },
				{ name: "Todo", link: "todo/list" },
			]
		},
		{
			name: "Stream",
			link: "stream",
			items: [
				{ name: "TTS voices", link: "tts" },
				{ name: "Playsounds", link: "playsound/list" },
				{ name: "Video request queue", link: "song-request/queue" },
				{ name: "Video request history", link: "song-request/history" }
			]
		},
		{
			name: "API",
			link: "api"
		},
		{
			name: "Contact",
			link: "contact"
		}
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
			app.locals.currentLocation = req.originalUrl;
		}

		if (req.session.passport) {
			const data = req.session.passport.user.data[0];
			const userData = await sb.User.get(data.login, false);

			res.locals.authUser = {
				login: data.login,
				display: data.display_name,
				id: data.id,
				image: data.profile_image_url,
				admin: data.login === "supinic",
				userData: userData
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
	app.locals.navitems.forEach(routeData => app.use("/" + routeData.link, require("./routes/" + routeData.link)));
	app.use("/track", require("./routes/track"));

	app.use("/api", require("./routes/api"));
	app.use("/rss", require("./routes/rss.js"));

	// @deprecated redirect to new commands endpoint
	app.use("/bot/commands*", (req, res) => res.redirect("/bot/command/list"));

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

	app.use(async (err, req, res, next) => {
		const errorID = await sb.SystemLogger.sendError("Website", err);
		return res.status(500).render("error", {
			error: "500 Internal Error",
			message: `Internal error encountered (ID ${errorID})`
		});
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