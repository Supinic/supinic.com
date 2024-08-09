const WebUtils = require("../../utils/webutils");
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
					.select("Channel.ID AS ID", "Channel.Name AS name", "Channel.Platform AS platform", "Channel.Specific_ID AS specificID", "Channel.Mode AS mode")
					.select("Channel.Mention AS mention", "Channel.Links_Allowed AS linksAllowed", "Channel.NSFW AS nsfw", "Channel.Banphrase_API_Type AS banphraseApiType")
					.select("Channel.Banphrase_API_URL AS banphraseApiUrl", "Channel.Banphrase_API_Downtime AS banphraseApiDowntime", "Channel.Message_Limit AS messageLimit")
					.select("Channel.Mirror AS mirror", "Channel.Description AS description")
					.from("chat_data", "Channel")
					.where("Mode <> %s", "Inactive")
					.orderBy("Name ASC")
				),
				Channel.getLinesCache()
			]);

			const platformsData = await WebUtils.getSupibotPlatformData();
			if (!platformsData) {
				throw new sb.Error({
					message: "Could not fetch Supibot platform data"
				});
			}

			data = channels.map(channel => {
				const platformName = platformsData[channel.platform].name;
				const databaseName = (platformName === "twitch")
					? channel.name
					: `${platformName.toLowerCase()}_${channel.name}`;

				const infoRow = informationSchema.find(i => i.channel === databaseName);
				channel.lineCount = infoRow?.Max_ID ?? null;
				channel.byteLength = infoRow?.Byte_Length ?? null;
				channel.platformName = platformName;

				return channel;
			});

			await sb.Cache.setByPrefix(channelListCacheKey, data, {
				expiry: 24 * 3_600_000
			});

			return data;
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

			// @todo this is a bandaid fix, please figure out a proper solution (possibly in sb.Cache)
			for (const item of data) {
				item.Byte_Length = Number(item.Byte_Length);
				item.Max_ID = Number(item.Max_ID);
			}

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
