module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const subroutes = [
		["author", "author.js"],
		["detail", "detail.js"],
		["favourite", "favourite.js"]
	];

	const columns = {
		gachi: ["🔁", "Name", "Published", "Author", "Favs", "ID"],
		lookup: ["🔁", "Name", "Published", "Author", "Favs", "ID"],
		todo: ["Name", "Published", "Author", "Added to list", "ID"]
	};

	for (const [route, file] of subroutes) {
		Router.use(`/${route}`, require(`./${file}`));
	}

	const fetchList = async (req, res, listType, inputData = {}) => {
		let sortColumn = 0;
		const searchParams = {
			includeYoutubeReuploads: "1"
		};

		if (listType === "todo") {
			searchParams.includeTags = "20";
			sortColumn = 4;
		}
		else if (listType === "gachi") {
			searchParams.includeTags = "6";
			sortColumn = 4;
		}
		else if (listType === "lookup") {
			searchParams.specificIDs = inputData.specificIDs;
			sortColumn = 4;
		}
		else {
			throw new sb.Error({
				message: `Unrecognized internal list type ${listType}`
			});
		}

		const { userID } = await sb.WebUtils.getUserLevel(req, res);
		if (userID) {
			searchParams.checkUserIDFavourite = String(userID);
		}

		const response = await sb.Got("Supinic", {
			url: "track/search",
			searchParams
		});

		if (response.statusCode !== 200) {
			return res.status(response.statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(response.statusCode),
				message: response.body.error.message
			});
		}

		const data = response.body.data.map(i => {
			const obj = {};
			if (listType !== "todo") {
				obj["🔁"] = (i.youtubeReuploads.length > 0)
					? sb.Utils.tag.trim `
						<a href="/track/redirect/${i.youtubeReuploads[0]}">
							<img class="reupload" src="/public/img/youtube-logo.png">
						</a>
					`
					: "";
			}

			obj.Name = sb.Utils.tag.trim `					
				<a rel="noopener noreferrer" target="_href" href="${i.parsedLink}">${i.name ?? i.link}</a>
			`;
			obj.Published = {
				value: (i.published) ? new sb.Date(i.published).format("Y-m-d") : "N/A",
				dataOrder: (i.published) ? new sb.Date(i.published).valueOf() : 0
			};
			obj.Author = (i.authors.length !== 0)
				? i.authors.map(author => `<a href="/track/author/${author.ID}">${author.name}</a>`).join(" ")
				: "N/A";

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

			obj.searchables = (i.aliases.length > 0) ? i.aliases.join(" ") : "";

			return obj;
		});

		res.render("generic-list-table", {
			title: `${sb.Utils.capitalize(listType)} track list`,
			data,
			head: columns[listType],
			sortColumn,
			pageLength: 25,
			sortDirection: "desc",
			specificFiltering: true,
			extraCSS: sb.Utils.tag.trim `
				img.reupload {
					height: 18px;
					width: 20px;
					cursor: pointer;
				}			
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
			extraScript: sb.Utils.tag.trim `
				async function beforeTableInitalize () {
					const favouriteList = document.getElementsByClassName("favourite");
					for (const element of favouriteList) {
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
			`,
			openGraphDefinition: [
				{
					property: "title",
					content: `Track lookup - ${data.length} tracks`
				},
				{
					property: "url",
					content: `https://supinic.com/track/lookup`
				}
			]
		});
	};

	Router.get("/lookup", async (req, res) => {
		await fetchList(req, res, "lookup", {
			specificIDs: req.query.ID
		});
	});

	Router.get("/redirect/:id", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Invalid track ID"
			});
		}

		const { data } = await sb.Got("Supinic", `track/resolve/${ID}`).json();
		if (!data.link) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "No track data found"
			});
		}

		res.redirect(data.link);
	});

	Router.get("/gachi/list", async (req, res) => {
		await fetchList(req, res, "gachi");
	});

	Router.get("/todo/list", async (req, res) => {
		await fetchList(req, res, "todo");
	});

	return Router;
})();
