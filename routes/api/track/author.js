module.exports = (function () {
	"use strict";
	const Express = require("express");
	const Router = Express.Router();

	const Author = require("../../../modules/track/author.js");

	/**
	 * @api {get} /track/author/list/ Author - List
	 * @apiName GetAuthorList
	 * @apiDescription Fetches a full list of Authors with no filtering
	 * @apiGroup Track-List
	 * @apiPermission any
	 * @apiSuccess {Object[]} data The list of authors
	 * @apiSuccess {number} author.ID
	 * @apiSuccess {string} author.name
	 * @apiSuccess {string} author.normalizedName
	 * @apiSuccess {string} [author.countryName]
	 * @apiSuccess {string} [author.notes]
	 * @apiSuccess {number} author.addedBy
	 * @apiSuccess {string} author.addedOn
	 * @apiSuccess {string} [author.lastEdit]
	 * @apiSuccess {string[]} [author.aliases]
	 */
	Router.get("/list", async (req, res) => {
		const data = await Author.list();
		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /track/author/search/ Author - Search list
	 * @apiName SearchAuthorList
	 * @apiDescription Fetches a filtered list of Authors. Each term is "AND" with others
	 * @apiGroup Track-List
	 * @apiPermission any
	 * @apiParam {string} [country] Filter by country
	 * @apiParam {string} [name] Filter by name
	 * @apiParam {string} [normalizedName] Filter by normalized name
	 * @apiSuccess {Object[]} data The list of authors
	 * @apiSuccess {number} author.ID
	 * @apiSuccess {string} author.name
	 * @apiSuccess {string} author.normalizedName
	 * @apiSuccess {string} [author.country]
	 * @apiSuccess {string} [author.notes]
	 * @apiSuccess {number} author.addedBy
	 * @apiSuccess {string} author.addedOn
	 * @apiSuccess {string} [author.lastEdit]
	 * @apiSuccess {string[]} [author.aliases]
	 */
	Router.get("/search", async (req, res) => {
		const {country, name, normalizedName} = req.query;
		const data = await Author.search({
			country,
			name,
			normalizedName
		});

		return sb.WebUtils.apiSuccess(res, {
			list: sb.Utils.convertCaseObject(data, "snake", "camel")
		});
	});

	/**
	 * @api {get} /track/author/list/ Author - Detail
	 * @apiName GetAuthorDetail
	 * @apiDescription Fetches data about a single Author
	 * @apiGroup Track-List
	 * @apiPermission any
	 * @apiSuccess {Object[]} data The list of authors
	 * @apiSuccess {number} author.ID
	 * @apiSuccess {string} author.name
	 * @apiSuccess {string} author.normalizedName Name normalized - all lowercase, whitespace replaced by underscore
	 * @apiSuccess {string} [author.country] Author's country of origin
	 * @apiSuccess {string} [author.notes] Notes
	 * @apiSuccess {number} author.addedBy ID of User who added the Author
	 * @apiSuccess {string} author.addedOn Date of addition of author as ISO string
	 * @apiSuccess {string} [author.lastEdit] Date of last edit of author as ISO string
	 * @apiSuccess {string[]} [author.aliases] Author's AKAs
	 * @apiSuccess {Object[]} tracks Summary list of tracks this Author has been involved in
	 * @apiSuccess {string} tracks.role This Author's role in the track
	 * @apiSuccess {number} tracks.ID Track ID
	 * @apiSuccess {string} tracks.name Track name
	 * @apiSuccess {string} tracks.published Track publish date as ISO string
	 */
	Router.get("/:id", async (req, res) => {
		const ID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(ID)) {
			return sb.WebUtils.apiFail(res, 400, "No ID provided");
		}

		const authorData = await Author.get(ID);
		if (!authorData) {
			return sb.WebUtils.apiFail(res, 404, "Author ID does not exist");
		}

		return sb.WebUtils.apiSuccess(res, authorData);
	});

	return Router;
})();