module.exports = (function () {
	"use strict";
	const Express = require("express");
	const Router = Express.Router();

	const Alias = require("../../../modules/track/alias.js");
	const allowedTables = ["Author", "Track"];

	const checkValidity = async (req, res) => {
		if (!res || !res.locals) {
			return { code: 401, error: "Session timed out" };
		}
		else if (!res.locals.authUser) {
			return { code: 401, error: "Unauthorized" };
		}

		const { table, tableID: rawTableID, alias } = req.query;
		const tableID = Number(rawTableID);

		if (!table) {
			return { code: 400, error: "No table provided" };
		}
		else if (!allowedTables.includes(table)) {
			return { code: 400, error: `Unknown table provided. Acceptable values: ${allowedTables.join(", ")}` };
		}
		else if (!sb.Utils.isValidInteger(tableID)) {
			return { code: 400, error: "No or invalid table ID provided" };
		}
		else if (!alias) {
			return { code: 400, error: "No alias provided" };
		}

		let row = null;
		try {
			row = await sb.Query.getRow("music", table);
			await row.load(tableID);
		}
		catch (e) {
			return { code: 400, error: `${table}.${tableID} does not exist` };
		}

		const exists = await Alias.existsCustom(q => q
			.where("Target_Table = %s", table)
			.where("Target_ID = %n", tableID)
			.where("Name = %s", alias)
		);

		return {
			data: [table, tableID, alias, exists]
		};
	};

	/**
	 * @api {post} /track/alias/ Alias - Create
	 * @apiName PostAlias
	 * @apiDescription Creates an Alias for Author or Track.
	 * @apiGroup Track-List
	 * @apiParam {string} table Target table of Alias. Can be Author or Track.
	 * @apiParam {number} tableID Target ID of target table. Must exist in the database.
	 * @apiParam {string} alias The alias to create. It must not exist already for table.tableID combination.
	 * @apiPermission login
	 * @apiSuccess {boolean} success If the insertion succeeds, data.success = true.
	 * @apiError {400} InvalidRequest If table is not provided<br>
	 * If table is not Author or Track<br>
	 * If tableID is not provided<br>
	 * If tableID is not a valid integer ID<br>
	 * If alias is not provided<br>
	 * If the record table.tableID does not exist<br>
	 * If the alias already exists for record table.tableID
	 * @apiError {401} Unauthorized If session timed out<br>
	 * If not logged in - unauthorized
	 */
	Router.post("/", async (req, res) => {
		const valid = await checkValidity(req, res);
		if (valid.error) {
			return sb.WebUtils.apiFail(res, valid.code, valid.error);
		}

		const [table, tableID, alias, exists] = valid.data;
		if (exists) {
			return sb.WebUtils.apiFail(res, 400, `Alias "${alias}" for ${table}.${tableID} already exists`);
		}

		await Alias.insertCustom({
			Target_Table: table,
			Target_ID: tableID,
			Name: alias,
			Added_By: res.locals.authUser.userData.ID,
			Added_On: new sb.Date()
		});

		return sb.WebUtils.apiSuccess(res, {
			success: true
		});
	});

	/**
	 * @api {delete} /track/alias/ Alias - Remove
	 * @apiName DeleteAlias
	 * @apiDescription Removes an Alias for Author or Track.
	 * @apiGroup Track-List
	 * @apiParam {string} table Target table of Alias. Can be Author or Track.
	 * @apiParam {number} tableID Target ID of target table. Must exist in the database.
	 * @apiParam {string} alias The alias to create. It must not exist already for table.tableID combination.
	 * @apiPermission login
	 * @apiSuccess {boolean} success If the insertion succeeds, data.success = true.
	 * @apiError {400} InvalidRequest If table is not provided<br>
	 * If table is not Author or Track<br>
	 * If tableID is not provided<br>
	 * If tableID is not a valid integer ID<br>
	 * If alias is not provided<br>
	 * If the record table.tableID does not exist<br>
	 * If the alias already exists for record table.tableID
	 * @apiError {401} Unauthorized If session timed out<br>
	 * If not logged in - unauthorized
	 */
	Router.delete("/", async (req, res) => {
		const valid = await checkValidity(req, res);
		if (valid.error) {
			return sb.WebUtils.apiFail(res, valid.code, valid.error);
		}

		const { level } = await sb.WebUtils.getUserLevel(req, res);
		if (level !== "moderator" && level !== "admin") {
			return sb.WebUtils.apiFail(res, 403, "Insufficient level");
		}

		const [table, tableID, alias, exists] = valid.data;
		if (!exists) {
			return sb.WebUtils.apiFail(res, 400, `Alias "${alias}" for ${table}.${tableID} does not exists`);
		}

		await Alias.deleteCustom(q => q
			.where("Target_Table = %s", table)
			.where("Target_ID = %s", tableID)
			.where("Name = %s", alias)
		);

		return sb.WebUtils.apiSuccess(res, {
			success: true
		});
	});

	return Router;
})();
