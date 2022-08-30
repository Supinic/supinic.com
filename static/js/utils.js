const timeUnits = {
	y: { d: 365, h: 8760, m: 525600, s: 31536000, ms: 31536000.0e3 },
	d: { h: 24, m: 1440, s: 86400, ms: 86400.0e3 },
	h: { m: 60, s: 3600, ms: 3600.0e3 },
	m: { s: 60, ms: 60.0e3 },
	s: { ms: 1.0e3 }
};

export function round (number, places = 0, options = {}) {
	const direction = options.direction ?? "round";
	if (!["ceil", "floor", "round", "trunc"].includes(direction)) {
		throw new Error("Invalid round direction provided");
	}

	return (Math[direction](number * (10 ** places))) / (10 ** places);
};

export function timeDelta (target, skipAffixes = false, respectLeapYears = false, deltaTo = undefined) {
	if (deltaTo === undefined) {
		deltaTo = new Date();
	}

	if (target.valueOf && typeof target.valueOf() === "number") {
		target = new Date(target.valueOf());
	}
	else {
		throw new TypeError("Invalid parameter type");
	}

	const delta = Math.abs(deltaTo.valueOf() - target.valueOf());
	if (delta === 0) {
		return "right now!";
	}

	let string;
	const [prefix, suffix] = (target > deltaTo) ? ["in ", ""] : ["", " ago"];

	if (delta < timeUnits.s.ms) {
		string = `${delta}ms`;
	}
	else if (delta < timeUnits.m.ms) {
		string = `${round(delta / timeUnits.s.ms, 2)}s`;
	}
	else if (delta < timeUnits.h.ms) {
		// Discards the data carried in the last 3 digits, aka milliseconds.
		// E.g. 119999ms should be parsed as "2min, 0sec"; not "1min, 59sec" because of a single millisecond.
		// Rounding to -3 turns 119999 to 120000, which makes the rounding work properly.
		const trimmed = round(delta, -3);

		const minutes = Math.trunc(trimmed / timeUnits.m.ms);
		const seconds = Math.trunc((trimmed / timeUnits.s.ms) % timeUnits.m.s);
		string = `${minutes}m, ${seconds}s`;
	}
	else if (delta < timeUnits.d.ms) {
		// Removing one millisecond from a time delta in (hours, minutes) should not affect the result.
		const trimmed = round(delta, -3);

		const hours = Math.trunc(trimmed / timeUnits.h.ms);
		const minutes = Math.trunc(trimmed / timeUnits.m.ms) % timeUnits.h.m;
		string = `${hours}h, ${minutes}m`;
	}
	else if (delta < timeUnits.y.ms) {
		// Removing any amount of milliseconds from a time delta in (days, minutes) should not affect the result.
		const trimmed = round(delta, -3);

		const days = Math.trunc(trimmed / timeUnits.d.ms);
		const hours = Math.trunc(trimmed / timeUnits.h.ms) % timeUnits.d.h;
		string = `${days}d, ${hours}h`;
	}
	else if (respectLeapYears) { // 365 days or more
		const [earlier, later] = (deltaTo < target) ? [deltaTo, target] : [target, deltaTo];

		// Removing any amount of milliseconds from a time delta in (days, minutes) should not affect the result.
		const trimmed = round(delta, -3);

		const laterRounded = new Date(earlier.valueOf() + trimmed);

		// how many whole years lie between the dates?
		let years = laterRounded.getUTCFullYear() - earlier.getUTCFullYear();
		// now only a difference of <1 year remains.
		// Then calculate the remaining time range -> The remaining time delta is then represented by
		// `earlierPlusYears` and `laterRounded`
		const earlierPlusYears = earlier.clone();
		earlierPlusYears.setUTCFullYear(earlierPlusYears.getUTCFullYear() + years);

		// this is in case `earlier` lies later "in the year" then `later`.
		// E.g. earlier=December 1 2019, later=January 1 2021 calculates
		// a year difference of `2`, but the number we want (whole years) is
		// 1.
		// I suppose a `if` would work too but I'm too afraid I would be missing edge cases by doing that.
		// Most of the time the while loop will run 0 or 1 times.
		while (earlierPlusYears.valueOf() > later) {
			earlierPlusYears.setUTCFullYear(earlierPlusYears.getUTCFullYear() - 1);
			years--;
		}

		// Calculate number of remaining days
		const remainingDelta = round(laterRounded.valueOf() - earlierPlusYears.valueOf(), -4);
		const days = Math.trunc(remainingDelta / timeUnits.d.ms);

		string = `${years}y, ${days}d`;
	}
	else { // 365 days or more
		// Removing any amount of seconds from a time delta in (years, days) should not affect the result.
		const trimmed = round(delta, -4);

		const years = Math.trunc(trimmed / timeUnits.y.ms);
		const days = Math.trunc(trimmed / timeUnits.d.ms) % timeUnits.y.d;
		string = `${years}y, ${days}d`;
	}

	return (skipAffixes)
		? string
		: (prefix + string + suffix);
}
