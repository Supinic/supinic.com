const initializeDatabase = require("supi-db-init");
const path = require("path");

const config = {
	auth: {
		user: process.env.MARIA_USER,
		host: process.env.MARIA_HOST,
		password: process.env.MARIA_PASSWORD
	},
	definitionFilePaths: [
		"supinic.com/tables/Log",
		"supinic.com/tables/Error",
		"supinic.com/tables/Link_Relay",
		"supinic.com/tables/Session"
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
