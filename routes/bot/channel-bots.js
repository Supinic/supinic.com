/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	Router.get("/list", async (req, res) => {
		const { data: {bots, badges} } = await sb.Got.instances.Supinic("bot-program/bot/list").json();
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
