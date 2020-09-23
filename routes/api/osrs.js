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

	Router.get("/lookup/:user", async (req, res) => {
		const user = req.params.user.toLowerCase();
		const { statusCode, body: rawData } = await sb.Got({
			throwHttpErrors: false,
			url: "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws",
			searchParams: new sb.URLParams()
				.set("player", user)
				.toString()
		}).text();

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
				result.skills.push({
					name: activity,
					rank,
					value
				});
			}

			index++;
		}

		return sb.WebUtils.apiSuccess(res, result);
	});

	return Router;
})();