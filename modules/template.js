const deleteAllFailsafeRegex = /(\w+)\s*=\s*\1/;

module.exports = class TemplateModule {
	static #columns = [];

	static async getRow (ID) {
		if (this.noIDs) {
			throw new sb.Error({
				message: `Module ${this.name} does not support fetching by ID`
			});
		}

		if ((await this.exists(ID)) === false) {
			return null;
		}

		const row = await sb.Query.getRow(this.database, this.table);
		await row.load(ID);
		return row;
	}

	static async selectSingleCustom (callback) {
		return await sb.Query.getRecordset(rs => {
			rs.single()
				.select(this.table + ".*")
				.from(this.database, this.table);

			callback(rs);
			return rs;
		});
	}

	static async selectMultipleCustom (callback) {
		if (typeof callback !== "function") {
			throw new sb.Error({
				message: "Custom select callback must be a function",
				args: typeof callback
			});
		}

		return await sb.Query.getRecordset(rs => {
			rs.select(this.table + ".*").from(this.database, this.table);
			callback(rs);
			return rs;
		});
	}

	static async selectAll () {
		return await sb.Query.getRecordset(rs => rs
			.select(this.table + ".*")
			.from(this.database, this.table)
		);
	}
	
	static async selectProperty (ID, property) {
		if (this.noIDs) {
			throw new sb.Error({
				message: `Module ${this.name} does not support fetching by ID`
			});
		}

		return (await sb.Query.getRecordset(rs => rs
			.select(property)
			.from(this.database, this.table)
			.where("ID = %n", ID)
			.single()
		)) || null;
	}

	static async exists (ID) {
		if (this.noIDs) {
			throw new sb.Error({
				message: `Module ${this.name} does not support fetching by ID`
			});
		}

		if (typeof ID !== "number" || ID < 1 || Math.trunc(ID) !== ID || !Number.isFinite(ID)) {
			throw new sb.Error({
				message: `ID must be a finite positive integer`,
				args: {
					type: typeof ID,
					ID: ID
				}
			});
		}

		return Boolean(await sb.Query.getRecordset(rs => rs
			.select("1")
			.from(this.database, this.table)
			.where("ID = %n", ID)
			.single()
		));
	}

	static async existsCustom (callback) {
		return Boolean(await sb.Query.getRecordset(rs => {
			rs.select("1")
				.from(this.database, this.table)
				.single();

			callback(rs);
			return rs;
		}));
	}

	static async existSome (...IDs) {
		if (this.noIDs) {
			throw new sb.Error({
				message: `Module ${this.name} does not support fetching by ID`
			});
		}

		return (await Promise.all(IDs.map(ID => this.exists(ID)))).some(i => i === true);
	}

	static async existAll (...IDs) {
		if (this.noIDs) {
			throw new sb.Error({
				message: `Module ${this.name} does not support fetching by ID`
			});
		}

		return (await Promise.all(IDs.map(ID => this.exists(ID)))).every(i => i === true);
	}

	static async insert (values) {
		const row = await sb.Query.getRow(this.database, this.table);
		row.setValues(values);
		return await row.save();
	}

	static async insertCustom (values) {
		if (!values || values.constructor !== Object || Object.keys(values).length === 0) {
			throw new sb.Error({
				message: "Custom insert values must be an Object with at least on property",
				args: values
			});
		}

		const definition = await sb.Query.getDefinition(this.database, this.table);
		const insert = {
			properties: [],
			values: []
		};

		Object.entries(values).forEach(([name, value]) => {
			const column = definition.columns.find(i => i.name === name);
			if (!column) {
				throw new sb.Error({
					message: "Unrecognized column",
					args: {
						database: this.database,
						table: this.table,
						column: name
					}
				});
			}

			insert.properties.push("`" + name + "`");
			insert.values.push(sb.Query.convertToSQL(value, column.type));
		});

		return await sb.Query.raw(`INSERT INTO ${this.escapedPath} (${insert.properties.join(",")}) VALUES (${insert.values.join(",")})`);
	}

	static async update (ID, values) {
		const row = await this.getRow(ID);
		row.setValues(values);
		return await row.save();
	}

	static async updateCustom (values, callback) {
		if (!values || values.constructor !== Object || Object.keys(values).length === 0) {
			throw new sb.Error({
				message: "Custom insert values must be an Object with at least on property",
				args: values
			});
		}

		if (typeof callback !== "function") {
			throw new sb.Error({
				message: "Custom update callback must be a function",
				args: typeof callback
			});
		}

		const condition = sb.Query.getCondition(callback);
		if (!condition || deleteAllFailsafeRegex.test(condition)) {
			throw new sb.Error({
				message: "Custom update condition must be set and cannot evaluate to true",
				args: condition
			});
		}

		const columnDefinition = (await sb.Query.getDefinition(this.database, this.table)).columns;
		const targets = Object.entries(values).map(([name, value]) => {
			const column = columnDefinition.find(i => i.name === name);
			if (!column) {
				throw new sb.Error({
					message: "Unrecognized column",
					args: {
						database: this.database,
						table: this.table,
						column: name
					}
				});
			}

			return "`" + name + "` = " + sb.Query.convertToSQL(value, column.type);
		});

		await sb.Query.raw(`UPDATE ${this.escapedPath} SET ${targets.join(",")} WHERE ${condition}`);
	}

	static async delete (ID) {
		const row = await this.getRow(ID);
		return await row.delete();
	}

	static async deleteCustom (callback) {
		if (typeof callback !== "function") {
			throw new sb.Error({
				message: "Custom delete callback must be a function",
				args: typeof callback
			});
		}

		const condition = sb.Query.getCondition(callback);
		if (!condition || deleteAllFailsafeRegex.test(condition)) {
			throw new sb.Error({
				message: "Custom delete condition must be set and cannot evaluate to true",
				args: condition
			});
		}

		await sb.Query.raw(`DELETE FROM ${this.escapedPath} WHERE ${condition}`);
	}

	/**
	 * Returns the list of columns' definitions for this table
	 * @returns {Promise<Object[]>}
	 */
	static async getColumnDefinitions () {
		const definition = await sb.Query.getDefinition(this.database, this.table);
		return definition.columns;
	}

	/**
	 * Returns the list of prettified column names
	 * @returns {Promise<Object[]>}
	 */
	static async getColumnNames () {
		const definition = await sb.Query.getDefinition(this.database, this.table);
		return definition.columns.map(i => sb.Utils.capitalize(i.name.replace(/_/, " ")));
	}

	// GETTERS

	/** @abstract */
	static get name () {
		throw new sb.Error({
			message: `get: name must be overriden`
		});
	}

	/** @abstract */
	static get database () {
		throw new sb.Error({
			message: `get: database must be overriden`
		});
	}

	/** @abstract */
	static get table () {
		throw new sb.Error({
			message: `get: table must be overriden`
		});
	}

	static get escapedPath () {
		return "`" + this.database + "`.`" + this.table + "`";
	}

	static get noIDs () { return false; }
};