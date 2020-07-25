module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Channel extends TemplateModule {
		static async list () {
			const [channels, informationSchema] = await Promise.all([
				sb.Query.getRecordset(rs => rs
					.select("Channel.ID", "Channel.Name", "Channel.Platform", "Channel.Specific_ID", "Channel.Mode")
					.select("Channel.Mention", "Channel.Links_Allowed", "Channel.NSFW", "Channel.Banphrase_API_Type")
					.select("Channel.Banphrase_API_URL", "Channel.Banphrase_API_Downtime", "Channel.Message_Limit")
					.select("Channel.Mirror", "Channel.Description")
					.select("Platform.Name AS Platform_Name")
					.from("chat_data", "Channel")
					.join("chat_data", "Platform")
					.where("Mode <> %s", "Inactive")
					.orderBy("Name ASC")
				),
				sb.Query.getRecordset(rs => rs
					.select("TABLE_NAME AS Channel")
					.select("(DATA_LENGTH + INDEX_LENGTH) AS Byte_Length")
					.select("AUTO_INCREMENT AS Max_ID")
					.from("INFORMATION_SCHEMA", "TABLES")
					.where("TABLE_SCHEMA = %s", "chat_line")
				)
			]);

			return channels.map(channel => {
				const databaseName = (channel.Platform_Name === "Twitch")
					? channel.Name
					: `${channel.Platform_Name.toLowerCase()}_${channel.Name}`;

				const infoRow = informationSchema.find(i => i.Channel === databaseName);
				if (!infoRow) {
					return null;
				}

				channel.Line_Count = infoRow.Max_ID;
				channel.Byte_Length = infoRow.Byte_Length;

				return channel;
			}).filter(Boolean);
		}

		static get name () { return "channel"; }
		static get database () { return "chat_data"; }
		static get table () { return "Channel"; }
	}

	return Channel;
})();