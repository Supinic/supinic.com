(async () => {
	const fs = require("fs").promises;
	const util = require("util");
	const {exec} = require("child_process");
	const readline = require("readline");

	const accessFile = "./db-access.js";
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	// Prepare readline.question for promisification
	rl.question[util.promisify.custom] = (question) => new Promise((resolve) => rl.question(question, resolve));

	const ask = util.promisify(rl.question);
	const shell = util.promisify(exec);

	const accessConfig = [
		["username", "MARIA_USER", "your_username"],
		["password", "MARIA_PASSWORD", "your_password"],
		["host", "MARIA_HOST", "your_host"],
		["port", "MARIA_PORT", "your_port"],
		["socket", "MARIA_SOCKET_PATH", "your_socket"]
	];

	console.log("Checking for database access file...");
	try {
		await fs.access(accessFile);
		console.log("Database access file exists, no need to copy the example.");
	} catch {
		console.log("Database access file does not exist - attempting to copy example access file...");
		try {
			await fs.copyFile("./db-access.js.example", accessFile);
			console.log("Example file copied successfully.");
		} catch (e) {
			console.error("Copying example file failed, aborting...", e);
			process.exit(1);
		}
	}

	let accessFileString = (await fs.readFile(accessFile)).toString();
	for (const [name, config, implicit] of accessConfig) {
		if (!accessFileString.includes(config)) {
			console.log(`The variable for database ${name} is gone (${config}) - skipping...`);
		} else if (!accessFileString.includes(implicit)) {
			console.log(`Database ${name} is already set up - skipping...`);
		} else {
			const result = await ask(`Set up database ${name} - type a new value (or nothing to keep empty})\n`);

			if (!result) {
				accessFileString = accessFileString.replace(implicit, "");
				await fs.writeFile(accessFile, accessFileString);
				console.log(`Variable for ${name} is now empty.`);
			} else {
				accessFileString = accessFileString.replace(implicit, result);
				await fs.writeFile(accessFile, accessFileString);
				console.log(`Variable for ${name} is now set up.`);
			}
		}
	}
	console.log("Database credentials setup successfully.");

	let packageManager = process.env.DEFAULT_PACKAGEMANAGER;
	if (!packageManager) {
		do {
			packageManager = await ask("Do you use npm or yarn as your package manager?\n");
			packageManager = packageManager.toLowerCase();
		} while (packageManager !== "npm" && packageManager !== "yarn");
	}

	console.log("Setting up database structure...");
	try {
		await shell(`${packageManager} run init-database`);
	} catch (e) {
		console.error("Database structure setup failed, aborting...", e);
		process.exit(1);
	}
	console.log("Structure set up successfully.");

	console.log("Loading database credentials & query builder...");
	try {
		eval(accessFileString);
		globalThis.sb = await require("supi-core")({
			whitelist: [
				"objects/date",
				"objects/error",
				"singletons/query"
			]
		});
	} catch (e) {
		console.error("Credentials/query builder load failed, aborting...", e);
		process.exit(1);
	}
	console.log("Query prepared.");

	console.log("Setting up website access...");
	const defaultUserAgent = process.env.DEFAULT_USER_AGENT;
	if (!defaultUserAgent) {
		let userAgent;
		do {
			userAgent = await ask("Select a default user-agent:");
		} while (!userAgent);

		const configRow = await sb.Query.getRow("data", "Config");
		await configRow.load("DEFAULT_USER_AGENT");
		configRow.values.Value = userAgent;
		await configRow.save();

		console.log(`Default user-agent has been set to: ${userAgent}\n`);
	}

	console.log("All done! Setup will now exit.");
	process.exit();
})();
