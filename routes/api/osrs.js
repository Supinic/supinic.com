module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const skillExperienceData = require("./osrs-xp.json");
	const reversedSkillExperienceData = skillExperienceData.reverse();
	const VIRTUAL_LEVEL_EXPERIENCE = skillExperienceData.find(i => i.level === 100).experience;

	// The ordering of these following skills and activities is **very** important!
	// Old School Runescape API does not provide any info about its values and instead relies on the ordering of
	// each numerical value being in a pre-determined order.
	// eslint-disable array-element-newline
	const skills = [
		"Overall",
		"Attack",
		"Defence",
		"Strength",
		"Hitpoints",
		"Ranged",
		"Prayer",
		"Magic",
		"Cooking",
		"Woodcutting",
		"Fletching",
		"Fishing",
		"Firemaking",
		"Crafting",
		"Smithing",
		"Mining",
		"Herblore",
		"Agility",
		"Thieving",
		"Slayer",
		"Farming",
		"Runecraft",
		"Hunter",
		"Construction"
	];
	const activities = [
		"League Points",
		"Bounty Hunter - Hunter",
		"Bounty Hunter - Rogue",
		"Clue Scrolls (all)",
		"Clue Scrolls (beginner)",
		"Clue Scrolls (easy)",
		"Clue Scrolls (medium)",
		"Clue Scrolls (hard)",
		"Clue Scrolls (elite)",
		"Clue Scrolls (master)",
		"LMS - Rank",
		"PVP Arena",
		"Soul Wars Zeal",
		"Guardians of the Rift",

		"Abyssal Sire",
		"Alchemical Hydra",
		"Barrows Chests",
		"Bryophyta",
		"Callisto",
		"Cerberus",
		"Chambers of Xeric",
		"Chambers of Xeric: Challenge Mode",
		"Chaos Elemental",
		"Chaos Fanatic",
		"Commander Zilyana",
		"Corporeal Beast",
		"Crazy Archaeologist",
		"Dagannoth Prime",
		"Dagannoth Rex",
		"Dagannoth Supreme",
		"Deranged Archaeologist",
		"General Graardor",
		"Giant Mole",
		"Grotesque Guardians",
		"Hespori",
		"Kalphite Queen",
		"King Black Dragon",
		"Kraken",
		"Kree'Arra",
		"K'ril Tsutsaroth",
		"Mimic",
		"Nex",
		"Nightmare",
		"Phosani's Nightmare",
		"Obor",
		"Sarachnis",
		"Scorpia",
		"Skotizo",
		"Tempoross",
		"The Gauntlet",
		"The Corrupted Gauntlet",
		"Theatre of Blood",
		"Theatre of Blood: Hard Mode",
		"Thermonuclear Smoke Devil",
		"Tombs of Amascut",
		"Tombs of Amascut: Expert Mode",
		"TzKal-Zuk",
		"TzTok-Jad",
		"Venenatis",
		"Vet'ion",
		"Vorkath",
		"Wintertodt",
		"Zalcano",
		"Zulrah"
	];
	// eslint-enable array-element-newline

	const oneHourTicks = 6000; // 60 minutes * 100 ticks per minute
	const itemCachePrefix = "osrs-item-price";
	const activityCachePrefix = "osrs-activity";
	const apiURLs = {
		main: "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws",
		seasonal: "https://secure.runescape.com/m=hiscore_oldschool_seasonal/index_lite.ws",
		ironman: {
			regular: "https://secure.runescape.com/m=hiscore_oldschool_ironman/index_lite.ws?",
			hardcore: "https://secure.runescape.com/m=hiscore_oldschool_hardcore_ironman/index_lite.ws",
			ultimate: "https://secure.runescape.com/m=hiscore_oldschool_ultimate/index_lite.ws"
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
		const { body: data } = await sb.Got({
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

		const response = await sb.Got({
			url,
			searchParams: { player },
			retry: 0,
			throwHttpErrors: false
		});

		if (response.redirectUrls.length !== 0) {
			return sb.WebUtils.apiFail(res, 502, "Old School Runescape API is currently unavailable", {
				redirectUrl: response.url
			});
		}
		else if (response.statusCode !== 200) {
			if (response.statusCode === 404) {
				return sb.WebUtils.apiFail(res, 404, "Player not found");
			}
			else {
				return sb.WebUtils.apiFail(res, 502, "Old School Runescape API error encountered", {
					externalResponse: response.body
				});
			}
		}

		let rawData = response.body;
		const mainTotalXP = Number(rawData.split("\n")[0].split(",")[2]);

		if (!result.seasonal) {
			// Note: OSRS API returns results for both ultimate and regular URLs if the account is an UIM,
			// and both hardcore and regular if the account is a HCIM. That's why this
			const types = ["ultimate", "hardcore", "regular"];
			const compare = {};

			for (const type of types) {
				const { statusCode, body } = await sb.Got({
					url: apiURLs.ironman[type],
					throwHttpErrors: false,
					searchParams: { player }
				});

				if (statusCode !== 404) {
					// Only exit loop when UIM data was found. In cases of HCIM, we must check normal IM data to
					// detect whether the account is alive or not, and adjust the response accordingly.
					if (type === "ultimate") {
						result.ironman.ultimate = true;
						rawData = body;
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
				const regularXP = Number(compare.regular.split("\n")[0].split(",")[2]);
				const hardcoreXP = Number(compare.hardcore.split("\n")[0].split(",")[2]);

				if (regularXP > hardcoreXP) {
					rawData = (forceHardcore)
						? compare.hardcore
						: compare.regular;

					result.ironman.regular = true;
					result.ironman.deadHardcore = true;
				}
				else {
					rawData = compare.hardcore;
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

			// This means that the account is visible on ironmen hiscores, but its main (de-ironed) total XP is
			// higher - hence, the account must have been de-ironed. Use the main data.
			const totalXP = Number(rawData.split("\n")[0].split(",")[2]);
			if (totalXP < mainTotalXP) {
				rawData = response.body;
				result.ironman.abandoned = true;
			}
		}

		const data = rawData.split("\n").map(i => i.split(",").map(Number));
		let index = 0;

		for (const skill of skills) {
			const [rank, level, experience] = data[index];
			const skillObject = {
				name: skill,
				rank: (rank === -1) ? null : rank,
				level,
				experience
			};

			if (skill !== "Overall") {
				if (experience >= VIRTUAL_LEVEL_EXPERIENCE) {
					const levelData = reversedSkillExperienceData.find(i => experience > i.experience);
					skillObject.virtualLevel = levelData.level;
				}
				else {
					skillObject.virtualLevel = level;
				}
			}

			result.skills.push(skillObject);
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

		const combatLevelData = calculateCombatLevelData(result.skills);
		if (combatLevelData) {
			result.combatLevel = combatLevelData.level;
		}

		return sb.WebUtils.apiSuccess(res, result, {
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
			return sb.WebUtils.apiFail(res, 400, { failed });
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

	Router.get("/comparisons", async (req, res) => {
		const [prayer, restore] = await Promise.all([
			fetchItemPrice(2434),
			fetchItemPrice(3024)
		]);

		res.render("generic", {
			data: `
				<script> 
					function round (number, places) {
						return (Math.round(number * (10 ** places))) / (10 ** places);
					}
				
					window.onload = () => {
						const range = document.getElementById("prayer-level");
						const label = document.getElementById("prayer-level-label");
						const prayerLabel = document.getElementById("prayer-points");
						const restoreLabel = document.getElementById("restore-points");
						const prayerPrice = document.getElementById("prayer-points-price");
						const restorePrice = document.getElementById("restore-points-price");
						
						range.addEventListener("input", () => {
							label.innerText = range.value;
							
							const pointsRestored = Math.floor(Number(range.value) / 4) + 7;	
							prayerLabel.innerText = pointsRestored;
							restoreLabel.innerText = pointsRestored + 1;					
							
							prayerPrice.innerText = round(${prayer.price} / 4 / pointsRestored, 2);
							restorePrice.innerText = round(${prayer.price} / 4 / (pointsRestored + 1), 2);
						});
					};
				</script>
				
				<div>
					Your prayer level: <label id="prayer-level-label">1</label>
					<br>
					<input id="prayer-level" type="range" min="1" max="99">
				</div>
				
				<br>
				
				<div>
					<a href="//osrs.wiki/Prayer_potion">
						<img alt="Prayer potion" src="https://secure.runescape.com/m=itemdb_oldschool/1603276214986_obj_sprite.gif?id=2434">				
					</a>
					<span id="prayer-price">costs ${prayer.price} gp</span>
					<span>restores <span id="prayer-points">7</span> prayer points</span>
					<span>costs <span id="prayer-points-price">N/A</span> gp per point</span>
				</div>
				
				<div>
					<a href="//osrs.wiki/Super_restore">
						<img alt="Super restore" src="https://secure.runescape.com/m=itemdb_oldschool/1603276214986_obj_sprite.gif?id=3024">				
					</a>
					<span id="restore-price">costs ${restore.price} gp</span>
					<span>restores <span id="restore-points">8</span> prayer points</span>
					<span>costs <span id="restore-points-price">N/A</span> gp per point</span>
				</div>			
			`
		});
	});

	return Router;
})();
