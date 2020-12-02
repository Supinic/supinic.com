/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/readme", async (req, res) => {
		res.render("generic", {
			data: sb.Utils.tag.trim `
				<h5 class="text-center">Make-a-bot program</h5>
				In this bot program, beginner and advanced programmers alike are encouraged to create their own chat bot.<br>
				The idea is that creating a bot is a task that requires multiple areas of knowledge, so that you can learn many things at once and connect them together.<br>
				Also, the project can be expanded ad infinitum until you get bored of it, or something.<br>
				<br>
				Bots can gain <a href="/bot/channel-bots/levels">levels</a> and <a href="/bot/channel-bots/badges">badges</a>.<br> 
				Levels represent basic functionality, and gaining a level requires achieving all previous levels.<br>
				Badges are like achievements - they are voluntary, but the present little challenges for bot creators.<br>
				<br>
				If you would like to enter the bot creators program, you can use the $suggest command in any channel that has Supibot.<br>
				Alternatively, you can enter <a href="//twitch.tv/supinic">Supinic's Twitch channel</a> and mention your idea to the chatters and discuss it.
			`
		})
	});

	Router.get("/list", async (req, res) => {
		const { data: {bots, badges} } = await sb.Got("Supinic", "bot-program/bot/list").json();
		const printData = bots.map(bot => {
			const botBadges = bot.badges.map(row => {
				const badge = badges.find(i => i.ID === row.ID);
				return (row.notes && row.notes.includes("https://"))
					? `<a style="float:left;" title="${badge.name}" href="${row.notes}">${badge.emoji}</a>`
					: `<div style="float:left;" title="${badge.name}">${badge.emoji}</div>`;
			});

			return {
				Name: `<div style="cursor: pointer; text-decoration: underline dotted;" title="${bot.description || "(no description)"}">${bot.name}</div>`,
				Prefix: bot.prefix,
				Author: bot.authorName,
				Language: bot.language,
				Level: {
					dataOrder: bot.level,
					value: `<a href="/bot/channel-bots/levels">${bot.level}</a>`
				},
				Badges: botBadges.join("")
			}
		});

		res.render("generic-list-table", {
			pageLength: 100,
			data: printData,
			head: Object.keys(printData[0])
		});
	});

	Router.get("/levels", async (req, res) => {
		const data = await sb.Query.getRecordset(rs => rs
			.select("*")
			.from("bot_data", "Level")
		);

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 25
		})
	});

	Router.get("/badges", async (req, res) => {
		const data = await sb.Query.getRecordset(rs => rs
			.select("Emoji", "Name", "Description")
			.from("bot_data", "Badge")
		);

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 25
		})
	});

	return Router;
})();
