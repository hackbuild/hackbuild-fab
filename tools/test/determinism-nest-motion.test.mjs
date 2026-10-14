// M07-T15 step 2 (D-056): the determinism legs hash every M07 reference's
// layoutHash, endHash and plan JSON. The ids are held here to sources the
// hashes script does not write: nest's scene list (packages/nest/scenes/index.ts),
// motion.run's program list, the committed fill record and the planner
// records' arguments. Run `npx tsc -b` first: hashes.mjs loads core from
// its dist build.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MOTION_RUNS, NEST_RUNS, nestMotionHashes } from "../determinism/hashes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));

/** Scenes whose nest is refused by design, so no layout exists to hash. */
const REFUSED = { "severed-deck": "the T04 fixture: CHK-SHT-01 refuses it before any placement" };

const out = {};
await nestMotionHashes(out);

test("every nest scene id has a layout id, except the refused fixture", () => {
  const ids = [...read("packages/nest/scenes/index.ts").matchAll(/\{ id: "([\w-]+)", kind: "(sheet|plate)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 4, `scene ids read: ${ids}`);
  for (const id of ids) {
    const has = Object.keys(out).some((k) => k.startsWith(`layout:${id}#`));
    if (REFUSED[id] !== undefined) assert.ok(!has, `${id} is refused (${REFUSED[id]}) yet has a layout id`);
    else assert.ok(has, `scene ${id} has no layout id in hashes.mjs NEST_RUNS`);
  }
  for (const k of Object.keys(out).filter((k) => k.startsWith("layout:"))) assert.match(out[k], /^[0-9a-f]{64}$/, k);
});

test("the SLUG fill layoutHash equals the committed fill record (M07-T05, T07)", () => {
  const rec = json("packages/nest/records/slug-fill.json").result.on.layoutHash;
  assert.equal(out["layout:slug-sheets#fill"], rec);
});

test("every motion.run family has an end or plan id", async () => {
  const { PROGRAM_IDS } = await import(pathToFileURL(path.join(ROOT, "core", "dist", "commands", "motion.run.js")).href);
  const families = new Set(PROGRAM_IDS.map((id) => id.split(".")[0]));
  assert.ok(families.size >= 5, `families read: ${[...families]}`);
  for (const f of families) {
    assert.ok(Object.keys(out).some((k) => /^(end|plan):/.test(k) && k.split(":")[1].startsWith(`${f}.`)), `family ${f} has no end or plan id`);
  }
  for (const [program] of MOTION_RUNS) assert.ok(PROGRAM_IDS.includes(program), `${program} is not a motion.run program`);
});

test("planner programs hash their plan and run on the records' arguments", () => {
  const detent = json("packages/motion/records/detent-plan.json").result.params;
  const washer = json("packages/motion/records/washer-plan.json").result.params;
  const args = Object.fromEntries(MOTION_RUNS.map(([p, a]) => [p, a]));
  assert.deepEqual(args["detent.square"], ["--side", String(detent.side), "--sample", String(detent.sample)]);
  assert.deepEqual(args["washer.square"], ["--side", String(washer.square)]);
  assert.match(out["plan:detent.square"], /^[0-9a-f]{64}$/);
  assert.match(out["plan:washer.square"], /^[0-9a-f]{64}$/);
  assert.equal(out["end:detent.square"], undefined);
});

test("a second run on this leg gives the same ids and hashes", async () => {
  const again = {};
  await nestMotionHashes(again);
  assert.deepEqual(again, out);
  assert.equal(Object.keys(out).length, NEST_RUNS.length + MOTION_RUNS.length);
});
