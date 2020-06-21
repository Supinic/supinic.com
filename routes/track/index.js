module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Author = require("../../modules/track/author.js");

	const subroutes = [
		["author", "author.js"],
		["detail", "detail.js"],
		["favourite", "favourite.js"]
	];

	subroutes.forEach(([name, link]) => Router.use("/" + name, require("./" + link)));

	const fetchList = async (req, res, listType) => {
		let searchParams = new sb.URLParams();
		let sortColumn = 0;

		if (listType === "todo") {
			searchParams.set("includeTags", "20");
			sortColumn = 4;
		}
		else if (listType === "gachi") {
			searchParams.set("includeTags", "6");
			sortColumn = 3;
		}
		else {
			throw new sb.Error({
				message: "Unrecognized internal list type " + listType
			});
		}

		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (userID) {
			searchParams.set("checkUserIDFavourite", String(userID));
		}

		const { data: raw } = await sb.Got.instances.Supinic({
			url: "track/search",
			searchParams: searchParams.toString()
		}).json();

		const authorIDs = new Set(raw.map(i => i.authors).flat());
		const authors = Object.fromEntries((await Author.selectMultipleCustom(rs => rs
			.where("ID IN %n+", Array.from(authorIDs))
		)).map(i => [i.ID, i.Name]));

		const data = raw.map(i => {
			const obj = {
				Name: `<a rel="noopener noreferrer" target="_href" href="${i.parsedLink}">${i.name ?? i.link}</a>`,
				Published: {
					value: (i.published) ? new sb.Date(i.published).format("Y-m-d H:i") : "N/A",
					dataOrder: (i.published) ? new sb.Date(i.published).valueOf() : 0
				},
				Author: (i.authors.length !== 0)
					? i.authors.map(authorID => `<a href="/track/author/${authorID}">${authors[authorID]}</a>`).join(" ")
					: "N/A"
			};

			if (listType === "todo") {
				obj["Added to list"] = {
					value: (i.addedOn) ? new sb.Date(i.addedOn).format("Y-m-d H:i") : "N/A",
					dataOrder: (i.addedOn) ? new sb.Date(i.addedOn).valueOf() : 0
				};
			}

			let imageElement = "";
			if (typeof i.isFavourite === "boolean") {
				const link = (i.isFavourite)
					? "/public/img/favourite-star.png"
					: "/public/img/favourite-star-off.png";

				imageElement = `<img onclick="toggleFavourite(window.event, this)" width="16" height="16" alt="favourite" src="${link}">`;
			}

			obj.Favs = `<div class="favourites">${i.favourites}</div>${imageElement}`;
			obj.ID = `<a target="_href" href="/track/detail/${i.ID}">${i.ID}</a>`;

			return obj;
		});

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			sortColumn,
			pageLength: 25,
			sortDirection: "desc",
			extraCSS: "div.favourites { display: initial }",
			extraScript: (async function toggleFavourite (event, element) {
				const row = event.path.find(i => i.tagName === "TR");
				const ID = [...row.children].find(i => i.getAttribute("field") === "ID").textContent;

				const { data } = await fetch("/api/track/favourite/track/" + ID, { method: "PUT" })
					.then(i => i.json())
					.catch(i => i.json());

				const sibling = element.previousSibling;
				if (data.statusCode === 403) {
					element.setAttribute("src", "/public/img/stop-sign.png");
				}
				else if (data.active === true) {
					sibling.textContent = String(Number(sibling.textContent) + 1);
					element.setAttribute("src", "/public/img/favourite-star.png");
				}
				else if (data.active === false) {
					sibling.textContent = String(Number(sibling.textContent) - 1);
					element.setAttribute("src", "/public/img/favourite-star-off.png");
				}
			}).toString()
		});
	};

	Router.get("/gachi/list", async (req, res) => {
		await fetchList(req, res, "gachi");
	});

	Router.get("/todo/list", async (req, res) => {
		await fetchList(req, res, "todo");
	});

	return Router;
})();