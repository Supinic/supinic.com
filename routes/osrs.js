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
		const consumables = [
			{
				name: "Prayer potion",
				img: "Prayer_potion(4).png",
				id: 2434,
				doses: 4,
				formula: (level) => Math.floor(level * 25 / 100) + 7,
				wrenchFormula: (level) => Math.floor(level * 27 / 100) + 7
			},
			{
				name: "Super restore",
				img: "Super_restore(4).png",
				id: 3024,
				doses: 4,
				formula: (level) => Math.floor(level * 25 / 100) + 8,
				wrenchFormula: (level) => Math.floor(level * 27 / 100) + 8
			},
			{
				name: "Sanfew serum",
				img: "Sanfew_serum(4).png",
				id: 10925,
				doses: 4,
				formula: (level) => Math.floor(level * 30 / 100) + 4,
				wrenchFormula: (level) => Math.floor(level * 32 / 100) + 4
			},
			{
				name: "Prayer regeneration potion",
				img: "Prayer_regeneration_potion(4).png",
				id: 30125,
				doses: 4,
				formula: () => 66
			},
			{
				name: "Ancient brew",
				img: "Ancient_brew(4).png",
				id: 26340,
				doses: 4,
				formula: (level) => Math.floor(level / 10) + 2
			},
			{
				name: "Forgotten brew",
				img: "Forgotten_brew(4).png",
				id: 27629,
				doses: 4,
				formula: (level) => Math.floor(level / 10) + 2
			},
			{
				name: "Zamorak brew",
				img: "Zamorak_brew(4).png",
				id: 2450,
				doses: 4,
				formula: (level) => Math.floor(level / 10)
			},
			{
				name: "Moonlight moth",
				img: "Moonlight_moth_(item).png",
				id: 28893,
				doses: 1,
				formula: () => 22
			},
			{
				name: "Moonlight moth mix",
				img: "Moonlight_moth_mix_(2).png",
				id: 29195,
				doses: 2,
				formula: () => 22
			},
			{
				name: "Prayer mix",
				img: "Prayer_mix(2).png",
				id: 11465,
				doses: 2,
				formula: (level) => Math.floor(level * 25 / 100) + 7,
				wrenchFormula: (level) => Math.floor(level * 27 / 100) + 7
			},
			{
				name: "Super restore mix",
				img: "Super_restore_mix(2).png",
				id: 11495,
				doses: 2,
				formula: (level) => Math.floor(level * 25 / 100) + 8,
				wrenchFormula: (level) => Math.floor(level * 27 / 100) + 8
			},
			{
				name: "Zamorak mix",
				img: "Zamorak_mix(2).png",
				id: 11521,
				doses: 2,
				formula: (level) => Math.floor(level / 10)
			},
			{
				name: "Jangerberries",
				img: "Jangerberries.png",
				id: 247,
				doses: 1,
				formula: () => 1
			}
		];

		const prices = {};
		for (const item of consumables) {
			const { price } = await fetchItemPrice(item.id);
			prices[item.id] = price;
		}

		const functionAwareStringJson = JSON.stringify(consumables, (key, value) => (
			(typeof value === "function") ? value.toString() : value
		));

		res.render("generic", {
			data: `
				<script> 
					const prices = JSON.parse('${JSON.stringify(prices)}');
					const consumables = JSON.parse('${functionAwareStringJson}', (key, value) => (
						(typeof value === "string" && value.startsWith("(")) ? eval(value) : value
					));
				
					const roundFix = (number, places = 0) => {
						const num = ((Math.round(number * (10 ** places))) / (10 ** places));
						return (Number.isFinite(num))
							? num.toFixed(2)
							: "N/A"
					}					
				
					window.onload = () => {						
						const consumablesEl = document.querySelector("table#consumables tbody");
						for (const item of consumables) {
							const rowEl = document.createElement("tr");
							
							const iconLinkEl = document.createElement("td");
							iconLinkEl.title = item.name;
							
							const imgEl = document.createElement("img");
							imgEl.alt = item.name;
							imgEl.src = "//oldschool.runescape.wiki/images/" + item.img;
							iconLinkEl.appendChild(imgEl);
							rowEl.appendChild(iconLinkEl);
							
							const nameEl = document.createElement("td");
							nameEl.title = item.name;
							rowEl.appendChild(nameEl);
							
							const linkEl = document.createElement("a");
							linkEl.href = "//osrs.wiki/" + item.name.replace(/\\s+/g, "_");
							linkEl.innerText = item.name;
							nameEl.appendChild(linkEl);
							
							const priceEl = document.createElement("td");
							priceEl.innerText = prices[item.id] + " gp";
							rowEl.appendChild(priceEl);
							
							const restoreEl = document.createElement("td");
							restoreEl.classList.add("text-center");
							restoreEl.id = item.id + "-restore-dose";
							restoreEl.innerHTML = "N/A";
							rowEl.appendChild(restoreEl);
							
							const restoreFullEl = document.createElement("td");
							restoreFullEl.classList.add("text-center");
							restoreFullEl.id = item.id + "-restore-full";
							restoreFullEl.innerHTML = "N/A";
							rowEl.appendChild(restoreFullEl);
							
							const costEl = document.createElement("td");
							costEl.id = item.id + "-cost";
							costEl.innerHTML = "N/A";
							rowEl.appendChild(costEl);
							
							consumablesEl.appendChild(rowEl);
						}
						
						const range = document.getElementById("prayer-level");
						const label = document.getElementById("prayer-level-label");
						const wrenchEl = document.getElementById("holy-wrench-enabled");
						
						// Invoke a proxy event
						wrenchEl.addEventListener("change", () => range.dispatchEvent(new Event("input")));
						
						range.addEventListener("input", () => {
							const level = Number(range.value);
							const wrenchEnabled = wrenchEl.checked;
							label.innerText = range.value;
							
							for (const item of consumables) {
								const restoreDoseEl = document.getElementById(item.id + "-restore-dose");
								const restoreFullEl = document.getElementById(item.id + "-restore-full");
								const itemCostEl = document.getElementById(item.id + "-cost");
								
								const pointsRestored = (wrenchEnabled && typeof item.wrenchFormula === "function")
								 	? item.wrenchFormula(level) 
								 	: item.formula(level);
								
								const pointsRestoredFull = pointsRestored * item.doses;
								const pointCost = roundFix(prices[item.id] / pointsRestored / item.doses, 2);
								
								restoreDoseEl.innerText = pointsRestored;
								restoreFullEl.innerText = pointsRestoredFull;
								itemCostEl.innerText = pointCost + " gp";
							}
						});
						
						// Forces first-time prices recalculation
						const dummyEvent = new Event("input");
						range.dispatchEvent(dummyEvent);					
					};
				</script>
				
				<div>
					Your prayer level: <label id="prayer-level-label">1</label>
					<br>
					<input id="prayer-level" type="range" min="1" max="99" value="99" style="width:100%"/>
					<br>
					<label for="holy-wrench-enabled"> Use Holy Wrench effect </label>
					<input id="holy-wrench-enabled" type="checkbox" class="pr-1">
				</div>
				
				<br>
				
				<table id="consumables">
					<thead>
						<th class="pl-2 pr-2">Potion</th>									
						<th class="pl-2 pr-2">Name</th>									
						<th class="pl-2 pr-2">Price</th>									
						<th class="pl-2 pr-2">Points/dose</th>									
						<th class="pl-2 pr-2">Points/full</th>									
						<th class="pl-2 pr-2">Cost/point</th>									
					</thead>
					<tbody></tbody>
				</table>		
			`
		});
	});

	return Router;
})();
