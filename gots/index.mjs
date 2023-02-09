import { definition as FakeAgent } from "./fake-agent.mjs";
import { definition as Helix } from "./helix.mjs";
import { definition as Global } from "./global.mjs";
import { definition as RPi4 } from "./rpi4.mjs";
import { definition as Supibot } from "./supibot.mjs";
import { definition as Supinic } from "./supinic.mjs";

const definitions = [
	FakeAgent,
	Helix,
	Global,
	RPi4,
	Supibot,
	Supinic
];

export { definitions };
export default definitions;
