const Express = require("express");
const Router = Express.Router();

const WebUtils = require("../../utils/webutils.js");

// The ordering of these following skills and activities is **very** important!
// Old School Runescape API does not provide any info about its values and instead relies on the ordering of
// each numerical value being in a pre-determined order.
const { experienceLevels } = require("./osrs-data.json");
const reversedexperienceLevels = experienceLevels.reverse();

const MAX_LEVEL = 99;
const VIRTUAL_LEVEL_XP_THRESHOLD = experienceLevels.find(i => i.level === 100).experience;

const oneHourTicks = 6000; // 60 minutes * 100 ticks per minute
const itemCachePrefix = "osrs-item-price";
const activityCachePrefix = "osrs-activity";
const apiURLs = {
	main: "https://secure.runescape.com/m=hiscore_oldschool/index_lite.json",
	seasonal: "https://secure.runescape.com/m=hiscore_oldschool_seasonal/index_lite.json",
	ironman: {
		regular: "https://secure.runescape.com/m=hiscore_oldschool_ironman/index_lite.json",
		hardcore: "https://secure.runescape.com/m=hiscore_oldschool_hardcore_ironman/index_lite.json",
		ultimate: "https://secure.runescape.com/m=hiscore_oldschool_ultimate/index_lite.json"
	}
};

const fetchItemPrice = async (ID) => {
	// Check sb.Cache first
	const cache = await sb.Cache.getByPrefix(itemCachePrefix, {
		keys: { ID }
	});
	if (cache) {
		return cache;
	}

	// Fetch item price from OSRS API
	const { body: data } = await sb.Got.get("Global")({
		url: "https://secure.runescape.com/m=itemdb_oldschool/api/catalogue/detail.json",
		responseType: "json",
		searchParams: {
			item: String(ID)
		}
	});

	const result = {
		ID: data.item.id,
		rawPrice: data.item.current.price,
		price: Number(
			String(data.item.current.price)
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
};

const fetchActivityData = async (ID) => {
	// Check sb.Cache first
	const cache = await sb.Cache.getByPrefix(activityCachePrefix, {
		keys: { ID }
	});

	if (cache) {
		return { success: true, total: cache };
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
		expiry: 300_000
	});

	return { success: true, total };
};

// Formulae and general algorithm based on OSRS Wiki: https://oldschool.runescape.wiki/w/Combat_level
const combatSkills = ["attack", "defence", "hitpoints", "magic", "prayer", "ranged", "strength"];
const calculateCombatLevelData = (skills) => {
	const combat = {};
	for (const skill of skills) {
		if (combatSkills.includes(skill.name.toLowerCase())) {
			combat[skill.name.toLowerCase()] = skill.level;
		}
	}

	// If at least one combat skill is missing, abort immediately
	if (!Object.values(combat).every(Boolean)) {
		return null;
	}

	const baseLevel = 0.25 * (combat.defence + combat.hitpoints + Math.floor(combat.prayer / 2));
	const meleeLevel = 0.325 * (combat.attack + combat.strength);
	const mageLevel = 0.325 * (combat.magic * 1.5);
	const rangeLevel = 0.325 * (combat.ranged * 1.5);

	let combatType = "melee";
	if (mageLevel > meleeLevel && mageLevel > rangeLevel) {
		combatType = "magic";
	}
	else if (rangeLevel > meleeLevel && rangeLevel > mageLevel) {
		combatType = "ranged";
	}

	const preciseCombatLevel = baseLevel + Math.max(meleeLevel, mageLevel, rangeLevel);
	return {
		level: Math.floor(preciseCombatLevel),
		fullLevel: preciseCombatLevel,
		type: combatType
	};
};

/**
 * @api {get} /osrs/lookup/:user Fetch user scores
 * @apiName FetchUserScores
 * @apiDescription For a given OSRS account name, fetches its scores
 * @apiGroup OSRS
 * @apiPermission none
 * @apiParam {string} user Account name to check
 * @apiParam {boolean} [seasonal] If true, checks the seasonal variant of the account (Leagues, DMM)
 * @apiParam {boolean} [forceHardcore] If true, forces to fetch HCIM data, even if the account has lost the HC status.
 * @apiSuccess {Object[]} skills
 * @apiSuccess {Object[]} activities
 * @apiSuccess {Object} ironman
 * @apiSuccess {boolean} ironman.regular
 * @apiSuccess {boolean} ironman.hardcore
 * @apiSuccess {boolean} ironman.ultimate
 * @apiSuccess {boolean} ironman.deadHardcore
 * @apiSuccess {boolean} ironman.abandoned True if an account has been "de-ironed"
 * @apiSuccess {boolean} seasonal
 * @apiSuccess {number} [combatLevel]
 */
Router.get("/lookup/:user", async (req, res) => {
	const player = req.params.user.toLowerCase();
	const url = (req.query.seasonal) ? apiURLs.seasonal : apiURLs.main;
	const forceHardcore = Boolean(req.query.forceHardcore);

	const result = {
		skills: [],
		activities: [],
		combatLevel: null,
		seasonal: Boolean(req.query.seasonal),
		ironman: {
			regular: false,
			hardcore: false,
			ultimate: false,
			deadHardcore: false,
			abandoned: false
		}
	};

	let initialResponse = await sb.Got.get("Global")({
		url,
		responseType: "json",
		searchParams: { player },
		retry: {
			limit: 0
		},
		throwHttpErrors: false
	});

	if (!initialResponse.ok) {
		console.warn("OSRS API not ok", {
			player,
			url,
			response: {
				body: initialResponse.body,
				headers: initialResponse.headers,
				redirect: initialResponse.redirectUrls
			}
		});
	}

	if (initialResponse.statusCode === 404 && !req.query.seasonal) {
		// If the user was not found on the "main" highscores, attempt to check their presence on the ironman-only
		// highscores. Some early accounts will show up in the less populated ranks, rather than the main one.
		// One more thing to note here: early HCIM or UIM will also have the same ranks issue as mains vs. ironmen,
		// but I believe that case is too niche to be considered. Although, that might be changed in the future.
		initialResponse = await sb.Got.get("Global")({
			url: apiURLs.ironman.regular,
			responseType: "json",
			searchParams: { player },
			retry: {
				limit: 0
			},
			throwHttpErrors: false
		});
	}

	if (initialResponse.redirectUrls.length !== 0) {
		const psaResponse = await sb.Got.get("GenericAPI")({
			url: "https://files.publishing.production.jxp.jagex.com/osrs.json"
		});

		if (!psaResponse.ok || !psaResponse.body.psa) {
			return WebUtils.apiFail(res, 502, "Old School Runescape API is unavailable", {
				redirectUrl: initialResponse.url
			});
		}

		const { isDisabled, psa } = psaResponse.body;
		return WebUtils.apiFail(res, 502, "Old School Runescape API is under maintenance", {
			isDisabled,
			psa
		});
	}
	else if (initialResponse.statusCode !== 200) {
		if (initialResponse.statusCode === 404) {
			return WebUtils.apiFail(res, 404, "Player not found");
		}
		else {
			return WebUtils.apiFail(res, 502, "Old School Runescape API error encountered", {
				externalResponse: initialResponse.body
			});
		}
	}

	let data = initialResponse.body;
	const mainTotalXP = data.skills.find(i => i.name === "Overall").xp;

	if (!result.seasonal) {
		// Note: OSRS API returns results for both ultimate and regular URLs if the account is a UIM,
		// and both hardcore and regular if the account is a HCIM. That's why this block needs to be executed
		const types = ["ultimate", "hardcore", "regular"];
		const compare = {};

		for (const type of types) {
			const { statusCode, body } = await sb.Got.get("Global")({
				url: apiURLs.ironman[type],
				responseType: "json",
				throwHttpErrors: false,
				searchParams: { player }
			});

			if (statusCode !== 404) {
				// Only exit the loop early when some UIM data was found. In cases of HCIM, we must check normal
				// IM data to detect whether the account is alive or not, and adjust the response accordingly.
				if (type === "ultimate") {
					result.ironman.ultimate = true;
					data = body;
					break;
				}
				else {
					compare[type] = body;
				}
			}
		}

		// Figuring out if a HCIM has died. If their total XP in the ironman leaderboard is higher than the total XP
		// in HCIM leaderboard, this means that they have lost the HCIM status.
		if (compare.hardcore && compare.regular) {
			const regularXP = compare.regular.skills.find(i => i.name === "Overall").xp;
			const hardcoreXP = compare.hardcore.skills.find(i => i.name === "Overall").xp;

			if (regularXP > hardcoreXP) {
				data = (forceHardcore)
					? compare.hardcore
					: compare.regular;

				result.ironman.regular = true;
				result.ironman.deadHardcore = true;
			}
			else {
				data = compare.hardcore;
				result.ironman.hardcore = true;
				result.ironman.deadHardcore = false;
			}
		}
		else if (compare.hardcore) {
			result.ironman.hardcore = true;
		}
		else if (compare.regular) {
			result.ironman.regular = true;
		}

		if (compare.regular) {
			const regularIronmanTotalXP = compare.regular.skills.find(i => i.name === "Overall").xp;

			// This means that the account is visible on ironmen hiscores, but its main (de-ironed) total XP is
			// higher - hence, the account must have been de-ironed. Use the main data instead of the IM data.
			if (regularIronmanTotalXP < mainTotalXP) {
				data = initialResponse.body;
				result.ironman.abandoned = true;
			}
			else if (!data) {
				// Only set the result `data` variable if it's not filled out yet. This is to prevent
				// accidental overriding of HCIM data (filled in above blocks) with regular IM data.
				data = compare.regular;
			}
		}
	}

	let virtualTotalLevel = 0;
	for (const skillObject of data.skills) {
		const { name, rank, level, xp } = skillObject;
		const resultSkillObject = {
			name,
			rank: (rank === -1) ? null : rank,
			level,
			experience: xp
		};

		if (name !== "Overall") {
			if (xp >= VIRTUAL_LEVEL_XP_THRESHOLD) {
				const levelData = reversedexperienceLevels.find(level => xp > level.experience);
				resultSkillObject.virtualLevel = levelData.level;
				virtualTotalLevel += (resultSkillObject.virtualLevel - MAX_LEVEL);
			}
			else {
				resultSkillObject.virtualLevel = level;
			}
		}
		else {
			virtualTotalLevel += resultSkillObject.level;
		}

		result.skills.push(resultSkillObject);
	}

	const totalLevel = result.skills.find(i => i.name === "Overall");
	totalLevel.virtualLevel = virtualTotalLevel;

	for (const activityObject of data.activities) {
		const { name, rank, score } = activityObject;
		result.activities.push({
			name,
			rank: (rank === -1) ? null : rank,
			value: score
		});
	}

	const combatLevelData = calculateCombatLevelData(result.skills);
	if (combatLevelData) {
		result.combatLevel = combatLevelData.level;
	}

	return WebUtils.apiSuccess(res, result, {
		skipCaseConversion: true
	});
});

Router.get("/activity/list", async (req, res) => {
	const IDs = await sb.Query.getRecordset(rs => rs
		.select("ID")
		.from("osrs", "Activity")
		.flat("ID")
	);

	const list = await Promise.all(IDs.map(i => fetchActivityData(i)));
	if (list.some(i => i.success === false)) {
		const failed = list.filter(i => i.success === false);
		return WebUtils.apiFail(res, 400, { failed });
	}

	const data = list.map(i => i.total);
	return WebUtils.apiSuccess(res, data);
});

Router.get("/activity/detail/:ID", async (req, res) => {
	const ID = Number(req.params.ID);
	if (!sb.Utils.isValidInteger(ID)) {
		return WebUtils.apiFail(res, 400, "Malformed activity ID");
	}

	const result = await fetchActivityData(ID);
	if (result.success === false) {
		return WebUtils.apiFail(res, result.statusCode, result.message);
	}

	return WebUtils.apiSuccess(res, result.total);
});

module.exports = Router;
