module.exports = (function () {
	const list = [];
	let listLoadPromise = sb.Query.getRecordset(rs => rs
		.select("*")
		.from("wow", "Material")
	).then(data => {
		for (const item of data) {
			if (item.Faction === "Both") {
				list.push(
					{  ...item,  Faction: "Alliance" },
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
					.select("Amount", "Faction", "Updated")
					.where("Material = %s", item.Name)
					.where("Faction = %s", item.Faction)
					.where("Server = %s", server)
					.orderBy("Updated DESC")
					.limit(2)
				);

				// Missing material info - skip
				if (statusData.length === 0) {
					continue;
				}

				const current = statusData[0];
				const delta = statusData[0].Amount - (statusData[1]?.Amount ?? statusData[0].Amount);

				data.push({
					Last_Update: current.Updated,
					Material: item.Name,
					Faction: current.Faction,
					Required: item.Required,
					Current: current.Amount,
					Delta: delta
				});
			}

			return data;
		}

		static get name () { return "Status"; }
		static get database () { return "wow"; }
		static get table () { return "Status"; }
	}

	return Status;
})();