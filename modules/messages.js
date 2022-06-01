module.exports = (function () {
	"use strict";

	const dayActivityPrefix = "site-channel-activity-day";

	class MessageThroughput {
		static async getList () {
			return await sb.Query.getRecordset(rs => rs
				.select("ID", "Name")
				.from("chat_data", "Channel")
				.fetch()
			);
		}

		static async lastDay (channelID, dateIdentifier = sb.Date.now()) {
			const date = new sb.Date(dateIdentifier);
			const dateString = date.format("Y-m-d");
			const before = date.clone().addHours(-24);
			const beforeString = before.format("Y-m-d");

			const cache = await sb.Cache.getByPrefix(dayActivityPrefix, {
				keys: {
					channelID,
					date: dateString
				}
			});

			if (cache) {
				return cache;
			}

			const rawData = await sb.Query.getRecordset(rs => rs
				.select("Timestamp", "SUM(Amount) AS Amount")
				.from("chat_data", "Message_Meta_Channel")
				.where("Channel = %n", channelID)
				.where("Timestamp >= %s", beforeString)
				.where("Timestamp <= %s", dateString)
				.groupBy("DAY(Timestamp)", "HOUR(Timestamp)")
				.orderBy("DAY(Timestamp)", "HOUR(Timestamp)")
				.limit(24)
				.fetch()
			);

			let i = 24;
			const data = [];
			const then = date.clone().discardTimeUnits("m", "s", "ms").addHours(-24);
			while (i) {
				const dataRow = rawData.find(row => row.Timestamp.discardTimeUnits("m", "s", "ms").valueOf() === then.valueOf());
				if (!dataRow) {
					data.push({
						Amount: 0
					});
				}
				else {
					data.push({
						Amount: dataRow.Amount
					});
				}

				then.addHours(1);
				i--;
			}

			await sb.Cache.setByPrefix(dayActivityPrefix, data, {
				keys: { channelID, date },
				expiry: 35 * 864e5 // 35 days
			});

			return data;
		}

		static async lastMonth (channelID) {
			const nowString = new sb.Date().format("Y-m-d");
			const beforeString = new sb.Date().addDays(-30).format("Y-m-d");

			return await sb.Query.getRecordset(rs => rs
				.select("Timestamp", "SUM(Amount) AS Amount")
				.from("chat_data", "Message_Meta_Channel")
				.where("Channel = %n", channelID)
				.where("Timestamp >= %s", beforeString)
				.where("Timestamp <= %s", nowString)
				.groupBy("MONTH(Timestamp)", "DAY(Timestamp)")
				.orderBy("MONTH(Timestamp)", "DAY(Timestamp)")
				.limit(30)
				.fetch()
			);
		}
	}

	return MessageThroughput;
})();
