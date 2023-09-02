const initializeDatabase = require("supi-db-init");
const path = require("path");

require("../db-access.js");

const config = {
	auth: {
		user: process.env.MARIA_USER,
		host: process.env.MARIA_HOST,
		password: process.env.MARIA_PASSWORD
	},
	definitionFilePaths: [
		"supinic.com/database",
		"supinic.com/tables/Log",
		"supinic.com/tables/Error",
		"supinic.com/tables/Link_Relay",
		"supinic.com/tables/Session"
	],
	sharedDefinitionNames: [
		"chat_data/database",
		"chat_data/tables/Command",
		"chat_data/tables/User_Alias",
		"chat_data/tables/Custom_Data_Property",
		"chat_data/tables/User_Alias_Data",
		"chat_data/tables/Platform",
		"chat_data/tables/Channel",
		"chat_data/tables/Filter",

		"data/database",
		"data/tables/Config"
	],
	initialDataFilePaths: [
		"data/Config"
	],
	sharedInitialDataNames: [
		"chat_data/Custom_Data_Property"
	],
	meta: {
		dataPath: path.join(__dirname, "initial-data"),
		definitionPath: path.join(__dirname, "definitions"),
		requiredMariaMajorVersion: 10
	}
};

initializeDatabase(config)
	.then(() => {
		console.log("OK");
		process.exit();
	})
	.catch(e => {
		console.error(e);
		process.exit();
	});
