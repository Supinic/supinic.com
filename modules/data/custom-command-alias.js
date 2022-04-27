module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class CustomCommandAlias extends TemplateModule {
		static async fetchForUser (userID, options = {}) {
			if (!userID) {
				throw new sb.Error({
					message: "No user ID provided"
				});
			}

			const { aliasIdentifier, includeArguments } = options;
			const data = await CustomCommandAlias.selectCustom(rs => {
				rs.select("Custom_Command_Alias.Name")
					.select("Custom_Command_Alias.Invocation")
					.select("Custom_Command_Alias.Created")
					.select("Custom_Command_Alias.Edited")
					.select("Custom_Command_Alias.Description")
					.select("ParentAuthor.Name AS Link_Author")
					.select("ParentAlias.Name AS Link_Name")
					.where("Custom_Command_Alias.User_Alias = %n", userID)
					.where("Custom_Command_Alias.Channel IS NULL")
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

				if (aliasIdentifier) {
					rs.where("Custom_Command_Alias.Name COLLATE utf8mb4_bin = %s", aliasIdentifier);
					rs.limit(1);
				}
				if (includeArguments) {
					rs.select("Custom_Command_Alias.Arguments");
				}

				return rs;
			});

			if (includeArguments) {
				for (const item of data) {
					item.Arguments = (item.Arguments) ? JSON.parse(item.Arguments) : [];
				}
			}

			return (aliasIdentifier) ? data[0] : data;
		}

		static get name () { return "custom-command-alias"; }
		static get database () { return "data"; }
		static get table () { return "Custom_Command_Alias"; }
	}

	return CustomCommandAlias;
})();
