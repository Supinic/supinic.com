// import RaidsData from "/public/json/raids3-data.json" assert { type: "json" };
import RaidsData from "/public/js/raids3-data.js";

const fullInvocationList = RaidsData.invocationCategories.flatMap(i => i.list);

const normalize = (str) => str.replaceAll(" ", "-").toLowerCase();

const findInvocationEl = (name) => document.querySelector(`li.invocation[name="${normalize(name)}"]`);

const recalculateSummary = () => {
	const { attributes, base, constants, invocationCategories, modes } = RaidsData;
	const invocations = fullInvocationList.filter(i => i.selected);
	
	let level = base.level;
	for (const invocation of invocations) {		
		level += invocation.level;
	}
	
	const uncapped = level * constants.percentagePerRaidLevel;
	const capped = Math.min(uncapped, constants.damagePercentageCap);
	const mode = modes.find(i => (i.min <= level && level <= i.max));
	
	const summaryEl = document.getElementById("summary");
	
	const iconEl = summaryEl.querySelector(`li[summary=icon]`);	
	iconEl.style.backgroundImage = `url(${mode.icon})`;
	
	const levelEl = summaryEl.querySelector(`li[summary=level]`);	
	levelEl.textContent = `Level: ${level}`;
	
	for (const attribute of attributes) {
		const attributeEl = summaryEl.querySelector(`li[summary=${attribute.name}]`);		
		const percentage = (attribute.capped) ? capped : uncapped;
		attributeEl.textContent = `${attribute.name}: +${percentage}%`;
	}	
};

const exportInvocations = () => {
	const selectedInvocations = fullInvocationList.filter(i => i.selected);
	
	let result = 0n;
	for (const invocation of selectedInvocations) {
		result += (1n << (BigInt(invocation.id) - 1n));
	}
	
	const string = result.toString(16).padStart(12, "0");
	alert(string);
};

const importInvocations = (hash = null) => {
	let rawValue;
	if (!hash) {
		rawValue = prompt("Provide your export string");
		if (!rawValue) {
			return;
		}
	}
	else {
		rawValue = hash;
	}
		
	const numValue = parseInt(rawValue, 16)
	if (Number.isNaN(numValue)) {
		return alert("Invalid value provided");
	}
	
	const value = BigInt(numValue);
	if (value < 0n || value > (1n << BigInt(fullInvocationList.length))) {
		return alert("Value is outside of working range");
	}
	
	clearInvocations();
	
	for (const invocation of fullInvocationList) {
		const mask = 1n << (BigInt(invocation.id) - 1n);
		if ((value & mask) === 0n) {
			continue;
		}
		
		const el = findInvocationEl(invocation.name);
		el.click();
	}
};

const clearInvocations = () => {
	const els = document.querySelectorAll("li.selected");
	for (const el of els) {
		el.classList.remove("selected");
	}
	
	for (const invocation of fullInvocationList) {
		invocation.selected = false;
	}
	
	recalculateSummary();
};

window.addEventListener("load", () => {
	const topListEl = document.getElementById("invocation-list");
	const fullInvocationList = RaidsData.invocationCategories.flatMap(i => i.list);
	for (const category of RaidsData.invocationCategories) {
		const { title, unique, boss, icon, list } = category;
		const titleEl = document.createElement("li");
		titleEl.textContent = title;		
		topListEl.appendChild(titleEl);
		
		const categoryListEl = document.createElement("ul");	
		const listItems = [];
		
		for (const invocation of list) {
			const { name, description, level, summary, requires, data } = invocation;

			const listItemEl = document.createElement("li");
			listItemEl.classList.add("invocation")
			listItemEl.setAttribute("name", normalize(name));
			listItemEl.setAttribute("fullName", name);
			listItemEl.textContent = `${name}: ${summary} +${level}`;

			listItemEl.addEventListener("select", function (evt) { 
				invocation.selected = evt.detail.selected;
				
				if (evt.detail.selected === false) {
					const name = this.getAttribute("fullName");
					const dependents = fullInvocationList.filter(i => i.requires?.includes(name));
					if (dependents.length > 0) {
						for (const dependent of dependents) {
							const el = document.querySelector(`li.invocation[fullName="${dependent.name}"]`);
							if (el.classList.contains("selected")) {
								el.click();
							}
						}
					}
				}
				
				recalculateSummary();
			});	
			
			listItemEl.addEventListener("otherUnselect", function (evt) { 
				if (!Array.isArray(requires)) {
					return;
				}
				else if (!requires.includes(evt.detail.name)) {
					return;
				}
				else {
					this.classList.remove("selected");
				}
			});			
			
			if (Array.isArray(requires)) {			
				listItemEl.addEventListener("click", function () {					
					const requiredEls = requires
						.map(i => document.querySelector(`li[name=${normalize(i)}]`))
						.filter(Boolean);
				
					const missing = requiredEls.filter(i => !i.classList.contains("selected"));
					if (this.classList.contains("selected") || missing.length === 0) {						
						const selected = this.classList.toggle("selected");
						const selectEvent = new CustomEvent("select", { detail: { selected } });
						this.dispatchEvent(selectEvent);
					}
					else {
						const missingNames = missing.map(i => i.getAttribute("fullName"));
						alert(`Requires: ${missingNames.join(", ")}`);
					}				
				});
			}
			else {
				listItemEl.addEventListener("click", function () { 
					const selected = this.classList.toggle("selected");
					const selectEvent = new CustomEvent("select", { detail: { selected } });
					this.dispatchEvent(selectEvent);
				});
			}
			
			categoryListEl.appendChild(listItemEl);
		}
		
		for (const listItemEl of categoryListEl.children) {				
			if (unique) {
				listItemEl.addEventListener("click", function () { 
					const others = Array.from(categoryListEl.children).filter(i => i !== this);
					for (const el of others) {
						el.classList.remove("selected");
						const selectEvent = new CustomEvent("select", { detail: { selected: false } });
						el.dispatchEvent(selectEvent);
					}
				});
			}		
		}
		
		topListEl.appendChild(categoryListEl);
	}

	recalculateSummary();
	
	document.getElementById("button-clear").addEventListener("click", () => clearInvocations());
	document.getElementById("button-import").addEventListener("click", () => importInvocations());
	document.getElementById("button-export").addEventListener("click", () => exportInvocations());
});