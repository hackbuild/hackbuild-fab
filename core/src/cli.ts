// hbf CLI entry (working name, D-012). The resolve hook must be registered
// before any @hackbuild module loads, so every other import is dynamic.
// @hackbuild/spec, chase.ts and build.ts load as TypeScript through Node's
// type stripping, unflagged from 22.18 and in 24.11 (the D-039 floors), so
// an older Node stops here with the floor instead of a loader stack.

import { register } from "node:module";

/** The engines floors, major.minor: ^22.18.0 || >=24.11.0. */
const FLOORS: readonly (readonly [number, number])[] = [[22, 18], [24, 11]];

const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
const supported = major > 24 || FLOORS.some(([m, n]) => major === m && minor >= n);
if (!supported) {
  process.stderr.write(`hbf: node ${process.versions.node} is below the floor ^22.18.0 || >=24.11.0; type stripping of spec, chase.ts and build.ts needs it. run nvm use from the repository root.\n`);
  process.exit(70);
}

register("./resolve-hook.js", import.meta.url);
const { main } = await import("./main.js");
const code = await main(process.argv.slice(2), process.cwd());
process.exitCode = code;
