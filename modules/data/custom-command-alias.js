module.exports = (function () {
	"use strict";

	const fetchAliasBasics = (rs) => rs.select("Custom_Command_Alias.Name")
		.select("Custom_Command_Alias.Invocation")
		.select("Custom_Command_Alias.Created")
		.select("Custom_Command_Alias.Edited")
		.select("Custom_Command_Alias.Description")
		.select("ParentAuthor.Name AS Link_Author")
		.select("ParentAlias.Name AS Link_Name")
		.leftJoin({
			alias: "ParentAlias",
			toDatabase: "data",
			toTable: "Custom_Command_Alias",
			on: "Custom_Command_Alias.Parent = ParentAlias.ID AND Custom_Command_Alias.Invocation IS NULL"
		})
		.leftJoin({
			alias: "ParentAuthor",
			toDatabase: "chat_data",
			toTable: "User_Alias",
			on: "ParentAlias.User_Alias = ParentAuthor.ID"
		});

	const fetchWrapper = async (options, callback) => {
		const data = await CustomCommandAlias.selectCustom(rs => {
			fetchAliasBasics(rs);
			callback(rs);

			if (options.includeArguments) {
				rs.select("Custom_Command_Alias.Arguments");
			}

			return rs;
		});

		if (options.includeArguments) {
			for (const item of data) {
				item.Arguments = (item.Arguments) ? JSON.parse(item.Arguments) : [];
			}
		}

		return data;
	};

	class CustomCommandAlias extends require("../template.js") {
		static async fetchDetailForChannel (channelID, aliasIdentifier, options = {}) {
			const data = fetchWrapper(channelID, options, rs => rs
				.where("Channel = %n", userID)
				.where("Custom_Command_Alias.Name COLLATE utf8mb4_bin = %s", aliasIdentifier)
				.limit(1)
			);

			return data[0];
		}

		static async fetchDetailForUser (userID, aliasIdentifier, options = {}) {
			const data = await fetchWrapper(rs, options, rs => rs
				.select("CASE WHEN (Parent IS NULL) THEN 'main' ELSE IF (Invocation IS NULL) THEN 'link' ELSE 'copy' END AS Alias_Type")
				.where("User_Alias = %n", userID)
				.where("Custom_Command_Alias.Name COLLATE utf8mb4_bin = %s", aliasIdentifier)
				.limit(1)
			);

			const [aliasData] = data;
			let childAliasData = null;

			if (options.includeChildAliasData) {
				childAliasData = await CustomCommandAlias.selectCustom(rs => rs
					.select("Owner.Name AS Username")
					.select("CASE WHEN Invocation IS NULL THEN 'link' ELSE 'copy' END AS Alias_Type")
					.join({
						alias: "Owner",
						toDatabase: "chat_data",
						toTable: "User_Alias",
						on: "Custom_Command_Alias.User_Alias = Owner.ID"
					})
					.where("Parent = %n", aliasData.ID)
				);
			}

			aliasData.childAliasData = childAliasData;
			return aliasData;
		}

		static async fetchListForChannel (channelID, options = {}) {
			if (!channelID) {
				throw new sb.Error({
					message: "No channel ID provided"
				});
			}

			return await fetchWrapper(options, rs => rs.where("Channel = %n", channelID));
		}

		static async fetchListForUser (userID, options = {}) {
			if (!userID) {
				throw new sb.Error({
					message: "No channel ID provided"
				});
			}

			return await fetchWrapper(options, rs => rs.where("User_Alias = %n", userID));
		}

		static get name () { return "custom-command-alias"; }
		static get database () { return "data"; }
		static get table () { return "Custom_Command_Alias"; }
	}

	return CustomCommandAlias;
})();
