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
			const date = new sb.Date(dateIdentifier).format("Y-m-d");
			const cache = await sb.Cache.getByPrefix(dayActivityPrefix, {
				keys: { channelID, date }
			});

			if (cache) {
				return cache;
			}

			const previousDay = "STR_TO_DATE(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 24 HOUR), '%Y-%m-%d %H:00:00'), '%Y-%m-%d %H:00:00')";
			const rawData = await sb.Query.getRecordset(rs => rs
				.select("Timestamp", "SUM(Amount) AS Amount")
				.from("chat_data", "Message_Meta_Channel")
				.where("Channel = %n", channelID)
				.where({
					raw: "Timestamp >= " + previousDay
				})
				.groupBy("DAY(Timestamp)", "HOUR(Timestamp)")
				.orderBy("DAY(Timestamp)", "HOUR(Timestamp)")
				.fetch()
			);

			let i = 24;
			const data = [];
			const then = new sb.Date().discardTimeUnits("m", "s", "ms").addHours(-24);
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
					})
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
			const data = [];
			const now = new sb.Date().discardTimeUnits("h", "m", "s", "ms");
			const iteratorDate = now.clone().addDays(-30);
			while (iteratorDate < now) {
				const dayData = await MessageThroughput.lastDay(channelID, iteratorDate);
				data.push({
					Amount: dayData.reduce((acc, cur) => acc += cur.Amount ?? 0, 0),
					Timestamp: iteratorDate.clone()
				});

				iteratorDate.addDays(1);
			}

			return data;
		}
	}

	return MessageThroughput;
})();