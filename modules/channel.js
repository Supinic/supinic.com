module.exports = (function () {
	"use strict";

	class Channel {
		static async list () {
			const channels = await sb.Query.getRecordset(rs => rs
				.select("Channel.*")
				.select("Platform.Name AS PlatformName")
				.from("chat_data", "Channel")
				.join("chat_data", "Platform")
				.where("Mode <> %s", "Inactive")
				.orderBy("Name ASC")
			);

			return await Promise.all(channels.map(async channel => {
				const dbName = (channel.PlatformName === "Twitch")
					? channel.Name
					: (channel.PlatformName.toLowerCase() + "_" + channel.Name);

				channel.LineCount = (await sb.Query.getRecordset(rs => rs
					.select("MAX(ID) AS LineCount")
					.from("chat_line", dbName)
				))[0].LineCount;

				channel.ByteLength = (await sb.Query.getRecordset(rs => rs
					.select("(DATA_LENGTH + INDEX_LENGTH) AS ByteLength")
					.from("INFORMATION_SCHEMA", "TABLES")
					.where("TABLE_SCHEMA = %s", "chat_line")
					.where("TABLE_NAME = %s", dbName)
				))[0].ByteLength;

				return channel;
			}));
		}
	}

	return Channel;
})();