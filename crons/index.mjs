import { CronJob } from "cron";
import { definition as OsrsItemFetcher } from "./osrs-item-fetcher.mjs";
import { definition as TrackAvailabilityUpdater } from "./track-availability-updater.mjs";

const definitions = [
	OsrsItemFetcher,
	TrackAvailabilityUpdater
];

const crons = [];
for (const definition of definitions) {
	const cron = {
		name: definition.name,
		description: definition.description,
		code: definition.code
	};

	const job = new CronJob(definition.expression, () => cron.code(cron));
	job.start();

	cron.job = job;
	crons.push(cron);
}

export { crons };
export default crons;
