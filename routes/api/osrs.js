module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const skills = [
		"Overall", "Attack", "Defence", "Strength", "Hitpoints", "Ranged", "Prayer", "Magic", "Cooking", "Woodcutting",
		"Fletching", "Fishing", "Firemaking", "Crafting", "Smithing", "Mining", "Herblore", "Agility", "Thieving",
		"Slayer", "Farming", "Runecrafting", "Hunter", "Construction"
	];
	const activities = [
		"League Points", "Bounty Hunter - Hunter", "Bounty Hunter - Rogue", "Clue Scrolls (all)",
		"Clue Scrolls (beginner)", "Clue Scrolls (easy)", "Clue Scrolls (medium)", "Clue Scrolls (hard)",
		"Clue Scrolls (elite)", "Clue Scrolls (master)", "LMS - Rank", "Abyssal Sire", "Alchemical Hydra",
		"Barrows Chests", "Bryophyta", "Callisto", "Cerberus", "Chambers of Xeric", "Chambers of Xeric: Challenge Mode",
		"Chaos Elemental", "Chaos Fanatic", "Commander Zilyana", "Corporeal Beast", "Crazy Archaeologist",
		"Dagannoth Prime", "Dagannoth Rex", "Dagannoth Supreme", "Deranged Archaeologist", "General Graardor",
		"Giant Mole", "Grotesque Guardians", "Hespori", "Kalphite Queen", "King Black Dragon", "Kraken", "Kree'Arra",
		"K'ril Tsutsaroth", "Mimic", "Nightmare", "Obor", "Sarachnis", "Scorpia", "Skotizo", "The Gauntlet",
		"The Corrupted Gauntlet", "Theatre of Blood", "Thermonuclear Smoke Devil", "TzKal-Zuk", "TzTok-Jad", "Venenatis",
		"Vet'ion", "Vorkath", "Wintertodt", "Zalcano", "Zulrah"
	];
	const oneHourTicks = 6000; // 60 minutes * 100 ticks per minute
	const itemCachePrefix = "osrs-item-price";
	const activityCachePrefix = "osrs-activity";

	const fetchItemPrice = async (ID) => {
		// Check sb.Cache first
		const cache = await sb.Cache.getByPrefix(itemCachePrefix, { ID });
		if (cache) {
			return cache.price;
		}

		// Fetch item price from OSRS API
		const { body: data } = await sb.Got({
			url: "https://secure.runescape.com/m=itemdb_oldschool/api/catalogue/detail.json",
			responseType: "json",
			searchParams: new sb.URLParams()
				.set("item", String(ID))
				.toString()
		});

		const result = {
			ID: data.item.id,
			rawPrice: data.item.current.price,
			price: Number(
				data.item.current.price
					.replace(",", "")
					.replace(/(.*)k$/, (total, price) => price * 1e3)
					.replace(/(.*)m$/, (total, price) => price * 1e6)
					.replace(/(.*)b$/, (total, price) => price * 1e9)
			)
		};

		// Make sure to set the price data back to sb.Cache for later retrieval
		await sb.Cache.setByPrefix(itemCachePrefix, result, {
			keys: { ID },
			expiry: 3_600_000
		});

		return result;
	}

	const fetchActivityData = async (ID) => {
		// Check sb.Cache first
		const cache = await sb.Cache.getByPrefix(activityCachePrefix, { ID });
		if (cache) {
			return cache;
		}

		const row = await sb.Query.getRow("osrs", "Activity");
		await row.load(ID, true);
		if (!row.loaded) {
			return {
				success: false,
				statusCode: 404,
				reason: "No activity found for given ID"
			};
		}

		const data = {
			in: JSON.parse(row.values.Input),
			out: JSON.parse(row.values.Output),
			process: JSON.parse(row.values.Process)
		};

		const itemIDs = new Set();
		for (const item of [...data.in, ...data.out]) {
			if (item.type === "item") {
				itemIDs.add(item.ID);
			}
		}

		const itemPriceData = await Promise.all([...itemIDs].map(itemID => fetchItemPrice(itemID)));
		const itemPrices = Object.fromEntries(
			itemPriceData.map(i => [i.ID, i.price])
		);

		const result = {
			single: {
				in: { price: 0 },
				out: { price: 0, experience: {} },
				ticks: 0
			},
			hourly: {
				in: { price: 0 },
				out: { price: 0, experience: {} }
			},
			ratio: null,
			afk: {
				true: 0,
				false: 0
			}
		};

		const { single, hourly } = result;
		for (const item of data.process) {
			single.ticks += item.ticks * item.amount;
			result.afk[item.afk ?? true] += item.ticks * item.amount;
		}

		result.ratio = oneHourTicks / single.ticks;

		for (const item of data.in) {
			const price = itemPrices[item.ID] * item.amount;
			single.in.price += price;
			hourly.in.price += price * result.ratio;
		}

		for (const item of data.out) {
			if (item.type === "item") {
				const price = itemPrices[item.ID] * item.amount;
				single.out.price += price;
				hourly.out.price += price * result.ratio;
			}
			else if (item.type === "experience") {
				if (!single.out.experience[item.skill]) {
					single.out.experience[item.skill] = 0;
				}
				if (!hourly.out.experience[item.skill]) {
					hourly.out.experience[item.skill] = 0;
				}

				const experience = item.amount * (item.count ?? 1);
				single.out.experience[item.skill] += experience;
				hourly.out.experience[item.skill] += experience * result.ratio;
			}
		}

		const total = {
			ID: row.values.ID,
			name: row.values.Name,
			description: row.values.Description,
			data: result,
			raw: data
		};

		await sb.Cache.setByPrefix(activityCachePrefix, total, {
			keys: { ID },
			expiry: 3_600_000
		})

		return { success: true, total };
	}

	Router.get("/lookup/:user", async (req, res) => {
		const user = req.params.user.toLowerCase();
		const { statusCode, body: rawData } = await sb.Got({
			throwHttpErrors: false,
			url: "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws",
			searchParams: new sb.URLParams()
				.set("player", user)
				.toString()
		});

		if (statusCode !== 200) {
			return sb.WebUtils.apiFail(res, 404, "Player not found");
		}

		const data = rawData.split("\n").map(i => i.split(",").map(Number));
		let index = 0;

		const result = { skills: [], activities: [] };
		for (const skill of skills) {
			const [rank, level, experience] = data[index];
			if (rank === -1) {
				result.skills.push({
					name: skill,
					rank: null,
					level: null,
					experience: null
				});
			}
			else {
				result.skills.push({
					name: skill,
					rank,
					level,
					experience
				});
			}

			index++;
		}

		for (const activity of activities) {
			const [rank, value] = data[index];
			if (rank === -1) {
				result.activities.push({
					name: activity,
					rank: null,
					value: null
				});
			}
			else {
				result.activities.push({
					name: activity,
					rank,
					value
				});
			}

			index++;
		}

		return sb.WebUtils.apiSuccess(res, result);
	});

	Router.get("/activity/list", async (req, res) => {
		const IDs = await sb.Query.getRecordset(rs => rs
		    .select("ID")
		    .from("osrs", "Activity")
			.flat("ID")
		);

		const list = await Promise.all(IDs.map(i => fetchActivityData(i)));
		if (list.some(i => i.success === false)) {
			return sb.WebUtils.apiFail(res, item.statusCode, item.message);
		}

		const data = list.map(i => i.total);
		return sb.WebUtils.apiSuccess(res, data);
	});

	Router.get("/activity/detail/:ID", async (req, res) => {
		const ID = Number(req.params.ID);
		if (!sb.Utils.isValidInteger(ID)) {
			return sb.WebUtils.apiFail(res, 400, "Malformed activity ID");
		}

		const result = await fetchActivityData(ID);
		if (result.success === false) {
			return sb.WebUtils.apiFail(res, result.statusCode, result.message);
		}

		return sb.WebUtils.apiSuccess(res, result.total);
	});

	return Router;
})();