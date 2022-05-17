(async function () {
	const { promisify } = require("util");
	const readFile = promisify(require("fs").readFile);
	try {
		require("../db-access.js");
	}
	catch {
		console.warn("Missing or invalid database access definition!");
		process.exit();
	}

	console.log("Loading utils");
	globalThis.sb = await require("supi-core")({
		whitelist: [
			"objects/date",
			"objects/error",
			"singletons/query"
		]
	});
	console.log("Utils loaded");

	const [{ version }] = await sb.Query.raw("SELECT VERSION() AS version");
	const major = Number(version.split(".")[0]);
	if (Number.isNaN(major) || major < 10) {
		throw new Error(`Your version of MariaDB is too old! Use at least 10.0 or newer. Your version: ${version}`);
	}

	let counter = 0;
	const definitionFileList = [
		"chat_data/database",
		"chat_data/tables/User_Alias",
		"chat_data/tables/Custom_Data_Property",
		"chat_data/tables/User_Alias_Data",

		"data/database",
		"data/tables/Config",

		"supinic.com/database",
		"supinic.com/tables/Error",
		"supinic.com/tables/Link_Relay",
		"supinic.com/tables/Log",
		"supinic.com/tables/Session"
	];

	console.log("=====\nStarting table definition script");
	for (const target of definitionFileList) {
		let content = null;

		try {
			content = await readFile(`${__dirname}/definitions/${target}.sql`);
		}
		catch (e) {
			console.warn(`An error occured while reading ${target}.sql! Skipping...`, e);
			continue;
		}

		let string = null;
		const [database, type, name] = target.split("/");
		if (type === "database") {
			string = `Database ${database}`;
		}
		else if (target.includes("tables")) {
			string = `Table ${database}.${name}`;
		}
		else if (target.includes("triggers")) {
			string = `Trigger ${database}.${name}`;
		}

		let status = null;
		try {
			const operationResult = await sb.Query.raw(content);
			status = operationResult.warningStatus;
		}
		catch (e) {
			console.warn(`An error occured while executing ${target}.sql! Skipping...`, e);
			continue;
		}

		if (status === 0) {
			counter++;
			console.log(`${string} created successfully`);
		}
		else {
			console.log(`${string} skipped - already exists`);
		}
	}

	console.log(`=====\nCreate script succeeded.\n${counter} objects created.`);

	const dataFileList = [
		"data/Config"
	];

	console.log("=====\nStarting data initialization script");
	counter = 0;
	for (const target of dataFileList) {
		let content = null;
		try {
			content = await readFile(`${__dirname}/initial-data/${target}.sql`);
		}
		catch (e) {
			console.warn(`An error occured while reading ${target}.sql! Skipping...`, e);
			continue;
		}

		const [database, table] = target.split("/");
		const rows = await sb.Query.raw(`SELECT COUNT(*) AS Count FROM \`${database}\`.\`${table}\``);
		if (rows.Count > 0) {
			console.log(`Skipped initializing ${database}.${table} - table is not empty`);
			continue;
		}

		let status = null;
		try {
			const operationResult = await sb.Query.raw(content);
			status = operationResult.warningStatus;
		}
		catch (e) {
			console.warn(`An error occured while executing ${target}.sql! Skipping...`, e);
			continue;
		}

		if (status === 0) {
			counter++;
			console.log(`${database}.${table} initial data inserted successfully`);
		}
		else if (status === 1) {
			counter++;
			console.log(`${database}.${table} initial data inserted successfully, some rows were skipped as they already existed before`);
		}
		else {
			console.log(`${database}.${table} initial data skipped - error occured`);
		}
	}

	console.log(`=====\nData initialization data script succeeded.\n${counter} tables initialized.`);

	process.exit();
})();
