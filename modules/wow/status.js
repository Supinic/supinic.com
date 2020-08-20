module.exports = (function () {
	const list = [];
	let listLoadPromise = sb.Query.getRecordset(rs => rs
		.select("*")
		.from("wow", "Material")
	).then(data => {
		for (const item of data) {
			if (item.Faction === "Both") {
				list.push(
					{  ...item, Faction: "Alliance" },
					{  ...item, Faction: "Horde" }
				);
			}
			else {
				list.push(item);
			}
		}
		listLoadPromise = null;
	});

	class Status extends require("../template.js") {
		static async getAllLatest (server) {
			if (listLoadPromise) {
				await listLoadPromise;
			}

			const data = [];
			for (const item of list) {
				const statusData = await this.selectCustom(q => q
					.select("MIN(Amount) AS Previous", "MAX(Amount) AS Amount", "Faction", "MAX(Updated) AS Updated")
					.where("Material = %s", item.Name)
					.where("Faction = %s", item.Faction)
					.where("Server = %s", server)
					.where("(Updated >= DATE_ADD(NOW(), INTERVAL -1 DAY)) OR Latest = %b", true)
					.orderBy("Updated DESC")
					.single()
				);

				// Missing material info - skip
				if (!statusData) {
					continue;
				}

				data.push({
					Last_Update: statusData.Updated,
					Material: item.Name,
					Faction: statusData.Faction,
					Required: item.Required,
					Current: statusData.Amount,
					Delta: statusData.Amount - statusData.Previous
				});
			}

			return data;
		}

		static async getMaterialDetail ({ faction, material }) {
			if (listLoadPromise) {
				await listLoadPromise;
			}

			const target = list.find(i => (
				i.Faction.toLowerCase() === faction.toLowerCase()
				&& i.Name.toLowerCase() === material.toLowerCase()
			));

			return target ?? null;
		}

		static async getMaterialHistory ({ faction, material, server }) {
			return await this.selectCustom(q => q
				.select("Updated", "Amount")
				.where("Material = %s", material)
				.where("Faction = %s", faction)
				.where("Server = %s", server)
				.orderBy("Updated ASC")
			);
		}

		static get name () { return "Status"; }
		static get database () { return "wow"; }
		static get table () { return "Status"; }
	}

	return Status;
})();