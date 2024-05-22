const Express = require("express");
const Router = Express.Router();

const Passport = require("passport");
const { OAuth2Strategy } = require("passport-oauth");

class TwitchBotStrategy extends OAuth2Strategy {
	// noinspection JSUnusedGlobalSymbols
	async userProfile (accessToken, done) {
		const response = await sb.Got("Global", {
			method: "GET",
			throwHttpErrors: false,
			responseType: "json",
			url: "https://api.twitch.tv/helix/users",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Client-ID": sb.Config.get("TWITCH_CLIENT_ID")
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

Passport.serializeUser((user, done) => done(null, user));
Passport.deserializeUser((user, done) => done(null, user));
Passport.use("twitch-bot", new TwitchBotStrategy(
	{
		authorizationURL: "https://id.twitch.tv/oauth2/authorize",
		tokenURL: "https://id.twitch.tv/oauth2/token",
		clientID: sb.Config.get("TWITCH_CLIENT_ID"),
		clientSecret: sb.Config.get("TWITCH_CLIENT_SECRET"),
		callbackURL: "https://supinic.com/bot/twitch-auth/callback"
	},
	(access, refresh, profile, done) => {
		profile.accessToken = access;
		profile.refreshToken = refresh;
		profile.source = "twitch-bot";

		done(null, profile);
	}
));

module.exports = (function () {
	"use strict";

	Router.get("/", (req, res, next) => {
		const authenticator = Passport.authenticate("twitch", {
			scope: "channel:bot",
			state: ""
		});

		authenticator(req, res, next);
	});

	Router.get(
		"/callback",
		Passport.authenticate("twitch", { failureRedirect: "/wcs" }),
		async (req, res) => {
			res.redirect("/bot/twitch-auth/landing");
		}
	);

	Router.get("/landing",async (req, res) => {
		res.render("generic", {
			data: `Success!`
		});
	});

	return Router;
})();
