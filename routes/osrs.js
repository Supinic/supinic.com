const Express = require("express");
const Router = Express.Router();

module.exports = (function () {
	"use strict";

	const getItemCacheKey = (id) => `osrs-item-price-cache-${id}`;

	const fetchItemPrice = async (itemId) => {
		const key = getItemCacheKey(itemId);
		let priceData = await sb.Cache.getByPrefix(key);
		if (!priceData) {
			const resp = await fetch(`https://prices.runescape.wiki/api/v1/osrs/latest?id=${itemId}`);
			const body = await resp.json();

			const { high, low } = body.data[itemId];
			priceData = {
				price: Math.round((high + low) / 2)
			};

			await sb.Cache.setByPrefix(key, priceData, {
				expiry: 600_000 // 10 minutes
			});
		}

		return priceData;
	};

	Router.get("/activity/list", async (req, res) => {
		const response = await sb.Got.get("Supinic")({
			url: "osrs/activity/list"
		});

		const printData = response.body.data.map(row => {
			const { afk, hourly } = row.data;
			const hourlyExperience = sb.Utils.round(Object.values(hourly.out.experience)[0], 0);
			const gpxp = sb.Utils.round(((hourly.out.price ?? 0) - (hourly.in.price ?? 0)) / hourlyExperience, 2);
			const afkPercent = sb.Utils.round(afk.true / (afk.true + afk.false) * 100, 0);

			return {
				Name: row.name,
				"XP/hr": {
					dataOrder: hourlyExperience,
					value: sb.Utils.groupDigits(hourlyExperience)
				},
				"GP/XP": {
					dataOrder: gpxp,
					value: gpxp.toFixed(2)
				},
				"Capital/hr": {
					dataOrder: (hourly.in.price ?? 0),
					value: sb.Utils.groupDigits((hourly.in.price ?? 0))
				},
				"AFK %": `${afkPercent}%`
			};
		});

		return res.render("generic-list-table", {
			title: "OSRS - Activity list",
			data: printData,
			head: ["Name", "XP/hr", "GP/XP", "Capital/hr", "AFK %"],
			pageLength: 10
		});
	});

	Router.get("/toa/calculator", async (req, res) => {
		res.render("toa-calculator");
	});

	Router.get("/prayer/comparisons", async (req, res) => {
		const [prayer, restore, sanfew] = await Promise.all([
			fetchItemPrice(2434),
			fetchItemPrice(3024),
			fetchItemPrice(10925)
		]);

		res.render("generic", {
			data: `
				<script> 
					function roundFix (number, places) {
						return ((Math.round(number * (10 ** places))) / (10 ** places)).toFixed(2);
					}
				
					window.onload = () => {
						const range = document.getElementById("prayer-level");
						const label = document.getElementById("prayer-level-label");
						
						const prayerLabel = document.getElementById("prayer-points");
						const restoreLabel = document.getElementById("restore-points");
						const sanfewLabel = document.getElementById("sanfew-points");
						
						const prayerPrice = document.getElementById("prayer-points-price");
						const restorePrice = document.getElementById("restore-points-price");
						const sanfewPrice = document.getElementById("sanfew-points-price");
						
						range.addEventListener("input", () => {
							label.innerText = range.value;
							
							const pointsRestored = Math.floor(Number(range.value) / 4) + 7;	
							const sanfewPointsRestored = Math.floor(Number(range.value * 3) / 10) + 4;	
							prayerLabel.innerText = String(pointsRestored);
							restoreLabel.innerText = String(pointsRestored + 1);					
							sanfewLabel.innerText = String(sanfewPointsRestored);					
							
							prayerPrice.innerText = roundFix(${prayer.price} / 4 / pointsRestored, 2);
							restorePrice.innerText = roundFix(${restore.price} / 4 / (pointsRestored + 1), 2);
							sanfewPrice.innerText = roundFix(${sanfew.price} / 4 / sanfewPointsRestored, 2);
						});
					};
				</script>
				
				<div>
					Your prayer level: <label id="prayer-level-label">1</label>
					<br>
					<input id="prayer-level" type="range" min="1" max="99" value="1" style="width:100%"/>
				</div>
				
				<br>
				
				<div title="Prayer potion">
					<a href="//osrs.wiki/Prayer_potion">
						<img alt="Prayer potion" src="https://oldschool.runescape.wiki/images/Prayer_potion%284%29.png?219da">				
					</a>
					<span id="prayer-price">costs ${prayer.price} gp</span>
					<span>restores <span id="prayer-points">7</span> prayer points</span>
					<span>costs <span id="prayer-points-price">N/A</span> gp per point</span>
				</div>
				
				<div title="Super restore">
					<a href="//osrs.wiki/Super_restore">
						<img alt="Super restore" src="https://oldschool.runescape.wiki/images/Super_restore%284%29.png?9074d">				
					</a>
					<span id="restore-price">costs ${restore.price} gp</span>
					<span>restores <span id="restore-points">8</span> prayer points</span>
					<span>costs <span id="restore-points-price">N/A</span> gp per point</span>
				</div>		
				
				<div title="Sanfew serum">
					<a href="//osrs.wiki/Sanfew_serum">
						<img alt="Sanfew serum" src="https://oldschool.runescape.wiki/images/Sanfew_serum%284%29.png?7313d">				
					</a>
					<span id="sanfew-price">costs ${sanfew.price} gp</span>
					<span>restores <span id="sanfew-points">4</span> prayer points</span>
					<span>costs <span id="sanfew-points-price">N/A</span> gp per point</span>
				</div>			
			`
		});
	});

	return Router;
})();
