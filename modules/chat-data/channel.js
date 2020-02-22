module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Channel extends TemplateModule {
		static async list () {
			const channels = await sb.Query.getRecordset(rs => rs
				.select("Channel.*")
				.select("Platform.Name AS Platform_Name")
				.from("chat_data", "Channel")
				.join("chat_data", "Platform")
				.where("Mode <> %s", "Inactive")
				.orderBy("Name ASC")
			);

			return await Promise.all(channels.map(async channel => {
				const dbName = (channel.Platform_Name === "Twitch")
					? channel.Name
					: (channel.Platform_Name.toLowerCase() + "_" + channel.Name);

				channel.Line_Count = (await sb.Query.getRecordset(rs => rs
					.select("MAX(ID) AS Line_Count")
					.from("chat_line", dbName)
					.limit(1)
					.single()
				)).Line_Count;

				channel.Byte_Length = (await sb.Query.getRecordset(rs => rs
					.select("(DATA_LENGTH + INDEX_LENGTH) AS Byte_Length")
					.from("INFORMATION_SCHEMA", "TABLES")
					.where("TABLE_SCHEMA = %s", "chat_line")
					.where("TABLE_NAME = %s", dbName)
					.limit(1)
					.single()
				)).Byte_Length;

				return channel;
			}));
		}

		static get name () { return "channel"; }
		static get database () { return "chat_data"; }
		static get table () { return "Channel"; }
	}

	return Channel;
})();