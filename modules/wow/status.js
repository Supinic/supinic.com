module.exports = (function () {
	const list = [];
	let listLoadPromise = sb.Query.getRecordset(rs => rs
		.select("*")
		.from("wow", "Material")
	).then(data => {
		for (const item of data) {
			list.push(item);
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
					.select("Amount", "Updated")
					.where("Material = %s", item.Name)
					.where("Server = %s", server)
					.orderBy("Updated DESC")
					.limit(1)
					.single()
				);

				// Missing material info - skip
				if (statusData.length === 0) {
					continue;
				}

				data.push({
					Last_Update: statusData.Updated,
					Material: item.Name,
					Faction: item.Faction,
					Required: item.Required,
					Current: statusData.Amount
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