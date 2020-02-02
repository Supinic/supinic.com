module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Channel extends TemplateModule {
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
					.limit(1)
					.single()
				)).LineCount;

				channel.ByteLength = (await sb.Query.getRecordset(rs => rs
					.select("(DATA_LENGTH + INDEX_LENGTH) AS ByteLength")
					.from("INFORMATION_SCHEMA", "TABLES")
					.where("TABLE_SCHEMA = %s", "chat_line")
					.where("TABLE_NAME = %s", dbName)
					.limit(1)
					.single()
				)).ByteLength;

				return channel;
			}));
		}

		static get name () { return "channel"; }
		static get database () { return "chat_data"; }
		static get table () { return "Channel"; }
	}

	return Channel;
})();