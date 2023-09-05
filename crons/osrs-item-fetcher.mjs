let isTableAvailable;

export const definition = {
	name: "osrs-new-items-fetcher",
	expression: "0 0 0 * * *",
	description: "Check new tradeable Old School Runescape items, and adds them to the database accordingly.",
	code: (async function osrsNewItemsFetcher (cron) {
		isTableAvailable ??= await sb.Query.isTablePresent("osrs", "Item");
		if (isTableAvailable === false) {
			cron.job.stop();
			return;
		}

		const databaseIDs = await sb.Query.getRecordset(rs => rs
			.select("Game_ID")
			.from("osrs", "Item")
			.flat("Game_ID")
		);

		const response = await sb.Got("Global", {
			responseType: "json",
			url: "https://prices.runescape.wiki/api/v1/osrs/mapping"
		});

		const missingItems = response.body.filter(i => !databaseIDs.includes(i.id));
		if (missingItems.length === 0) {
			return;
		}

		for (const item of missingItems) {
			const row = await sb.Query.getRow("osrs", "Item");
			row.setValues({
				Game_ID: item.id,
				Name: item.name,
				Aliases: null,
				Value: item.value
			});

			await row.save({ skipLoad: true });
		}
	})
};
