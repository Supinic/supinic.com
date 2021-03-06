module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const IMAGE_NOT_FOUND_URL = "/public/img/cross.png";

	const removeReferences = (string) => string.replace(/\[(.+?)]\((\d+)\)/g, "$1");
	const linkify = (string) => (
		string.replace(/\[(.+?)]\((\d+)\)/g, sb.Utils.tag.trim `
			<a href="/data/origin/detail/$2">
				<img class="linked-emote" loading="lazy" alt="$1" title="$1" src="/api/data/origin/image/$2"/>
			</a>
		`)
	);

	Router.get("/list", async (req, res) => {
		const { data } = await sb.Got("Supinic", {
			url: "/data/origin/list",
			searchParams: {
				skipReplacedEmotes: "true"
			}
		}).json();

		const renderData = data.map(i => {
			const emote = (i.url) ? `<img alt="${i.name}" loading="lazy" class="list-emote" src="${i.url}"/>` : "N/A";
			return {
				Emote: `<a target="_blank" href="/data/origin/detail/${i.ID}">${emote}</a>`,
				Name: i.name,
				Type: i.type ?? "N/A"
			};
		});

		res.render("generic-list-table", {
			data: renderData,
			head: Object.keys(renderData[0]),
			pageLength: 10,
			sortColumn: 1,
			sortDirection: "asc",
			specificFiltering: true,
			extraCSS: sb.Utils.tag.trim `
				img.list-emote { 
					height: 32px;
					max-width: 128px;
			 	}
			`,
			openGraphDefinition: [
				{
					property: "title",
					content: `Emote origin list`
				},
				{
					property: "description",
					content: "Many Twitch, BTTV, FFZ, Discord and other emotes' origins, authors and miscellaneous data can be found here."
				}
			]
		});
	});

	Router.get("/detail/:id", async (req, res) => {
		const id = Number(req.params.id);
		const response = await sb.Got("Supinic", `/data/origin/detail/${id}`);
		if (response.statusCode !== 200) {
			return res.status(response.statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(response.statusCode),
				message: response.body.error.message
			});
		}

		const { data } = response.body;

		const authorDetails = [];
		if (data.author) {
			authorDetails.push(`by ${data.author}`);
		}
		if (data.emoteAdded) {
			const addedOn = new sb.Date(data.emoteAdded).format("Y-m-d");
			authorDetails.push(`on ${addedOn}`);
		}

		const originAddDetails = [];
		if (data.reporter) {
			originAddDetails.push(`by ${data.reporter}`);
		}
		if (data.recordAdded) {
			const addedOn = new sb.Date(data.recordAdded).format("Y-m-d");
			originAddDetails.push(`on ${addedOn}`);
		}

		const raffleDetails = [];
		if (data.raffle) {
			const addedOn = new sb.Date(data.raffle).format("Y-m-d");
			raffleDetails.push(`raffled on ${addedOn}`);
		}
		if (data.raffleWinner) {
			raffleDetails.push(`won by ${data.raffleWinner}`);
		}

		const tier = (data.tier) ? `Tier ${data.tier}` : "";
		const renderData = {
			ID: data.ID,
			Image: (data.url)
				? `<img alt="${data.name}" class="detail-emote" src="${data.url}"/>`
				: "N/A",
			Name: data.name,
			"Emote ID": (data.detailUrl && data.emoteID)
				? `<a href="${data.detailUrl}">${data.emoteID}</a>`
				: data.emoteID ?? "N/A",
			Type: `${tier} ${data.type}`,
			Description: (data.text)
				? linkify(data.text)
				: "N/A",
			"Emote added": (authorDetails.length !== 0) ? authorDetails.join(", ") : "N/A",
			"Raffle details": (raffleDetails.length !== 0) ? raffleDetails.join(", ") : "N/A",
			"Origin added": (originAddDetails.length !== 0) ? originAddDetails.join(", ") : "N/A",
			Notes: (data.notes)
				? linkify(data.notes)
					.replace(/(https?:\/\/.+?)(\s|$)/gi, `<a rel="noopener noreferrer" target="_blank" href="$1">$1</a>$2`)
					.replace(/\r?\n/g, "<br>")
				: "N/A"
		};

		res.render("generic-detail-table", {
			data: renderData,
			extraCSS: sb.Utils.tag.trim `
				img.linked-emote { 
					height: 28px;
					max-width: 64px;
				}
				img.detail-emote { max-height: 128px; }
				td.key { width: 100px; }
			`,
			openGraphDefinition: [
				{
					property: "title",
					content: `Origin of ${data.type} emote ${data.name}`
				},
				{
					property: "description",
					content: (data.text)
						? sb.Utils.wrapString(removeReferences(data.text), 300)
						: "(no text available)"
				},
				{
					property: "author",
					content: data.author ?? "unknown"
				},
				{
					property: "image",
					content: data.url ?? IMAGE_NOT_FOUND_URL
				},
				{
					property: "url",
					content: `https://supinic.com/data/origin/detail/${data.ID}`
				}
			]
		});
	});

	return Router;
})();
