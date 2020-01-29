module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Author = require("../../modules/track/author.js");

	Router.use("/author", require("./author.js"));
	Router.use("/detail", require("./detail.js"));

	Router.get("/todo/list", async (req, res) => {
		const raw = JSON.parse(await sb.Utils.request({
			uri: "https://supinic.com/api/track/search?includeTags=20"
		}));

		const authorIDs = new Set(raw.data.map(i => i.authors).flat());
		const authors = Object.fromEntries((await Author.selectMultipleCustom(rs => rs
			.where("ID IN %n+", Array.from(authorIDs))
		)).map(i => [i.ID, i.Name]));

		const data = raw.data.map(i => ({
			ID: `<a target="_href" href="/track/detail/${i.ID}">${i.ID}</a>`,
			Name: `<a rel="noopener noreferrer" target="_href" href="${i.parsedLink}">${i.name ?? i.link}</a>`,
			Published: (i.published)
				? new sb.Date(i.published).format("Y-m-d H:i")
				: "N/A",
			Author: (i.authors.length !== 0)
				? i.authors.map(authorID => `<a href="/track/author/${authorID}">${authors[authorID]}</a>`).join(" ")
				: "N/A",
			"Added to list": new sb.Date(i.addedOn).format("Y-m-d H:i"),
		}));

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			pageLength: 25,
			sortColumn: 3,
			sortDirection: "desc"
		});
	});

	return Router;
})();