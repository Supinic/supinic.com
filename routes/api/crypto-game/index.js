module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Asset = require("../../../modules/crypto-game/asset.js");
	const Portfolio = require("../../../modules/crypto-game/portfolio.js");

	/**
	 * @api {get} /crypto-game/asset/list Crypto-game asset list with prices
	 * @apiName GetCryptoGameAssetList
	 * @apiDescription Gets the full list of available assets to use in the crypto-game command.
	 * @apiGroup CryptoGame
	 * @apiPermission none
	 * @apiSuccess {Object[]} asset
	 * @apiSuccess {string} asset.code Unique identifier
	 * @apiSuccess {string} [asset.name] Full name of the asset
	 * @apiSuccess {string} asset.type Description of the asset - currency, crypto, physical, ...
	 * @apiSuccess {number} asset.price Specific price of the asset in the baseline asset
	 * @apiSuccess {boolean} asset.baseline Determines a singular asset which acts as the baseline prices for others
	 * @apiSuccess {date} [asset.lastUpdate]
	 **/
	Router.get("/asset/list", async (req, res) => {
		const data = await Asset.selectAll();
		return sb.WebUtils.apiSuccess(res, data);
	});

	/**
	 * @api {get} /crypto-game/asset/list Crypto-game active portfolio list
	 * @apiName GetCryptoGamePortfolioList
	 * @apiDescription Gets the full list of active portfolios, along with their owners and converted totals
	 * @apiGroup CryptoGame
	 * @apiPermission none
	 * @apiSuccess {Object[]} portfolio
	 **/
	Router.get("/portfolio/list", async (req, res) => {
		const data = await Portfolio.selectAll();
		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();