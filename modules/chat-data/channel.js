module.exports = (function () {
	const TemplateModule = require("../template.js");

	const linesCacheKey = "website-channel-lines";
	const channelListCacheKey = "website-channel-list";

	const User = require("../chat-data/user-alias.js");

	class Channel extends TemplateModule {
		/**
		 * @param {Object} [options]
		 * @param {boolean} [options.force] Ignore caching and force a new result
		 * @returns {Promise<Object[]>}
		 */
		static async list (options = {}) {
			let data = await sb.Cache.getByPrefix(channelListCacheKey);
			if (!options.force && data) {
				return data;
			}

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
				Channel.getLinesCache()
			]);

			data = channels.map(channel => {
				const databaseName = (channel.Platform_Name === "Twitch")
					? channel.Name
					: `${channel.Platform_Name.toLowerCase()}_${channel.Name}`;

				const infoRow = informationSchema.find(i => i.Channel === databaseName);
				channel.Line_Count = infoRow?.Max_ID ?? null;
				channel.Byte_Length = infoRow?.Byte_Length ?? null;

				return channel;
			});

			await sb.Cache.setByPrefix(channelListCacheKey, data, {
				expiry: 24 * 3_600_000
			});
		}

		static async getLinesCache () {
			const cacheData = await sb.Cache.getByPrefix(linesCacheKey);
			if (cacheData) {
				return cacheData;
			}

			const data = await sb.Query.getRecordset(rs => rs
				.select("TABLE_NAME AS Channel")
				.select("(DATA_LENGTH + INDEX_LENGTH) AS Byte_Length")
				.select("AUTO_INCREMENT AS Max_ID")
				.from("INFORMATION_SCHEMA", "TABLES")
				.where("TABLE_SCHEMA = %s", "chat_line")
			);

			await sb.Cache.setByPrefix(linesCacheKey, data, {
				expiry: 24 * 3_600_000
			});

			return data;
		}

		/**
		 * @param {number} channelID
		 * @returns {Promise<*[]>}
		 */
		static async getAmbassadorList (channelID) {
			const row = await sb.Query.getRow("chat_data", "Channel_Data");
			await row.load({ Channel: channelID, Property: "ambassadors" }, true);
			if (!row.loaded) {
				return [];
			}

			const result = [];
			const userIDs = JSON.parse(row.values.Value);
			for (const userID of userIDs) {
				const userData = await User.getByID(userID);
				result.push({
					ID: userData.ID,
					name: userData.Name
				});
			}

			return result;
		}

		static get name () { return "channel"; }
		static get database () { return "chat_data"; }
		static get table () { return "Channel"; }
	}

	return Channel;
})();
