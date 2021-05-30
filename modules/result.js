module.exports = class Result {
	constructor (success, string, data = null, parent = null) {
		this.success = Boolean(success);
		this.failed = !this.success;

		this.string = string || "No extra info provided";
		this.data = data;
		this.parent = parent;
	}

	toString () {
		const result = [this.string];
		let target = this.parent;
		while (target !== null) {
			result.push(target.string);
			target = target.parent;
		}

		return result.join("; ");
	}
};
