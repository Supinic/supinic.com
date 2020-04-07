/* global sb */
module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const ChannelBot = require("../../modules/bot-data/bot.js");

	Router.get("/", async (req, res) => {
		const rawData = await ChannelBot.selectMultipleCustom(q => q
			.select("Bot_Author.Name AS Creator")
			.select("Bot_User_Alias.Name AS Bot_Name")
			.select("IFNULL(GROUP_CONCAT(Badge.Name SEPARATOR ','), '') AS Badges")
			.join({
				alias: "Bot_Author",
				toDatabase: "chat_data",
				toTable: "User_Alias",
				on: "Bot.Author = Bot_Author.ID"
			})
			.join({
				alias: "Bot_User_Alias",
				toDatabase: "chat_data",
				toTable: "User_Alias",
				on: "Bot.Bot_Alias = Bot_User_Alias.ID"
			})
			.leftJoin({
				toDatabase: "bot_data",
				toTable: "Bot_Badge",
				on: "Bot_Badge.Bot = Bot.Bot_Alias"
			})
			.leftJoin({
				toDatabase: "bot_data",
				toTable: "Badge",
				on: "Bot_Badge.Badge = Badge.ID"
			})
			.where("Active = %b", true)
			.groupBy("Bot.Bot_Alias")
		);

		const data = await Promise.all(rawData.map(i =>
			(async () => {
				const badges = await sb.Query.getRecordset(rs => rs
					.select("Badge.Name AS Name", "Badge.Emoji AS Emoji", "Bot_Badge.Notes AS Notes")
					.from("bot_data", "Bot_Badge")
					.join({
						toDatabase: "bot_data",
						toTable: "Badge",
						on: "Bot_Badge.Badge = Badge.ID"
					})
					.where("Bot_Badge.Bot = %n", i.Bot_Alias)
				);

				const badgeInfo = badges.map(badge => {
					if (badge.Notes && badge.Notes.includes("https://")) {
						return `<a style="float:left;" title="${badge.Name}" href="${badge.Notes}">${badge.Emoji}</a>`;
					}
					else {
						return `<div style="float:left;" title="${badge.Name}">${badge.Emoji}</div>`;
					}
				});

				return {
					Name: `<div style="cursor: pointer; text-decoration: underline dotted;" title="${i.Description || "(no description)"}">${i.Bot_Name}</div>`,
					Prefix: i.Prefix,
					Author: i.Creator,
					Language: i.Language,
					Level: {
						dataOrder: i.Level,
						value: `<a href="/bot/channel-bots/levels">${i.Level}</a>`
					},
					Badges: badgeInfo.join(""),
				};
			})()
		));

		res.render("generic-list-table", {
			pageLength: 25,
			data: data,
			head: Object.keys(data[0])
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
