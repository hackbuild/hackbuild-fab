// Writes expected/firmware.ino of each PIP button reference (M06-T08
// acceptance): firmwareStub of packages/archetypes on the reference's
// design and pins. firmware.ino is a rendered file under expected/, not a
// parity golden, so it has this one named writer (D-227); each button
// reference test imports STUBS and fails when the committed file differs.
//
//   node packages/archetypes/scripts/firmware-stubs.mjs           compare each file
//   node packages/archetypes/scripts/firmware-stubs.mjs --write   write each file
//
// Run `npx tsc -b packages/archetypes` first; the script reads dist/ and
// resolves the spec sources through core's resolve hook.

import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

const here = (p) => new URL(p, import.meta.url);

/** Each button reference, the design name its stub carries and the pins it reads. */
export const STUBS = [
  { reference: "reference/buttons/click-spring", design: "click-spring", pins: [{ name: "KEY", pin: "GP4", kind: "key" }] },
  { reference: "reference/buttons/flex-cone", design: "flex-cone", pins: [{ name: "KEY", pin: "GP2", kind: "key" }] },
  { reference: "reference/buttons/touch-comb", design: "touch-comb", pins: [{ name: "KEY", pin: "GP12", kind: "touch" }] },
];

/** The stub row of one reference. */
export function stubOf(reference) {
  const row = STUBS.find((s) => s.reference === reference);
  if (row === undefined) throw new Error(`${reference} has no firmware stub row`);
  return row;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  register(here("../../../core/dist/resolve-hook.js"));
  const { firmwareStub } = await import(here("../dist/index.js").href);
  let differ = 0;
  for (const s of STUBS) {
    const file = here(`../../../${s.reference}/expected/firmware.ino`);
    const text = firmwareStub(s.design, s.pins);
    if (process.argv.includes("--write")) writeFileSync(file, text);
    const same = readFileSync(file, "utf8") === text;
    if (!same) differ++;
    process.stdout.write(`${s.reference}/expected/firmware.ino ${same ? "equal" : "differs"}\n`);
  }
  process.exitCode = differ === 0 ? 0 : 1;
}
