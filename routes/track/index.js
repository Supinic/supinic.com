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
					value: (i.published) ? new sb.Date(i.published).format("Y-m-d") : "N/A",
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

			let imageClass = "";
			if (typeof i.isFavourite === "boolean") {
				imageClass = (i.isFavourite) ? "favourite active" : "favourite inactive";
			}

			obj.Favs = `<div class="${imageClass}">${i.favourites}</div>`;
			obj.ID = `<a target="_href" href="/track/detail/${i.ID}">${i.ID}</a>`;

			return obj;
		});

		res.render("generic-list-table", {
			data: data,
			head: Object.keys(data[0]),
			sortColumn,
			pageLength: 25,
			sortDirection: "desc",
			specificFiltering: true,
			extraCSS: sb.Utils.tag.trim`
				div.favourite { 					
				    background-position: center; 
				    background-repeat: no-repeat;
				    background-size: contain;
			    }
			    div.favourite.active { 
			        background-image: url("/public/img/favourite-star.png");
			    }
			    div.favourite.inactive { 
			        background-image: url("/public/img/favourite-star-off.png");
			    }
			    div.favourite.loading {
			        background-image: url("/public/img/ppCircle.gif");
			    }
			`,
			extraScript: sb.Utils.tag.trim`
				async function beforeTableInitalize () {
					const list = document.getElementsByClassName("favourite");
					for (const element of list) {
						element.parentElement.addEventListener("click", () => toggleFavourite(element));
					}
				}
				 				
				async function toggleFavourite (element) {
					if (element.classList.contains("loading")) {
						console.log("Aborted requested, previous is still pending");
						return;
					}
					
					const row = element.parentElement.parentElement;
					const ID = Array.from(row.children).find(i => i.getAttribute("field") === "ID").textContent;	
					
					element.classList.remove("inactive");
					element.classList.remove("active");
					element.classList.add("loading");
					const { data } = await fetch("/api/track/favourite/track/" + ID, { method: "PUT" })
						.then(i => i.json())
						.catch(i => i.json());
					
					element.classList.remove("loading");
	
					if (data.statusCode === 403) {
						element.classList.add("inactive");
						alert("Your session expired! Please log in again.");
					}
					else if (data.active === true) {
						element.textContent = String(data.amount);
						element.classList.add("active");
					}
					else if (data.active === false) {
						element.textContent = String(data.amount);
						element.classList.add("inactive");
					}
				}
			`
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