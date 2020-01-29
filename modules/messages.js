module.exports = (function () {
	"use strict";

	class MessageThroughput {
		static async getList () {
			return await sb.Query.getRecordset(rs => rs
				.select("ID", "Name")
				.from("chat_data", "Channel")
				.fetch()
			);
		}

		static async lastHour (channelID) {
			const rawData = await sb.Query.getRecordset(rs => rs
				.select("Timestamp", "Amount")
				.from("chat_data", "Message_Meta_Channel")
				.where("Channel = %n", channelID)
				.where("Timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)")
				.fetch()
			);

			let i = 60;
			const data = [];
			const then = new sb.Date().discardTimeUnits("s", "ms").addMinutes(-60);

			while (i) {
				const dataRow = rawData.find(row => row.Timestamp.valueOf() === then.valueOf());
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

				then.addMinutes(1);
				i--;
			}

			return data.slice(1);
		}

		static async lastDay (channelID) {
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

			return data;
		}

		static async lastMonth (channelID) {
			const previousMonth = "STR_TO_DATE(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y-%m-%d %H:00:00'), '%Y-%m-%d %H:00:00')";
			const rawData = await sb.Query.getRecordset(rs => rs
				.select("Timestamp", "SUM(Amount) AS Amount")
				.from("chat_data", "Message_Meta_Channel")
				.where("Channel = %n", channelID)
				.where({
					raw: "Timestamp >= " + previousMonth
				})
				.groupBy("YEAR(Timestamp)", "MONTH(Timestamp)", "DAY(Timestamp)")
				.orderBy("YEAR(Timestamp)", "MONTH(Timestamp)", "DAY(Timestamp)")
				.fetch()
			);

			let i = 30;
			const data = [];
			const then = new sb.Date().discardTimeUnits("h", "m", "s", "ms").addDays(-30);

			while (i) {
				const dataRow = rawData.find(row => row.Timestamp.discardTimeUnits("h", "m", "s", "ms").valueOf() === then.valueOf());
				if (!dataRow) {
					data.push({
						Timestamp: then.clone(),
						Amount: 0
					});
				}
				else {
					data.push({
						Timestamp: dataRow.Timestamp,
						Amount: dataRow.Amount
					})
				}

				then.addDays(1);
				i--;
			}

			return data;
		}
	}

	return MessageThroughput;
})();