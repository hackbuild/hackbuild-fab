// Browser specs write screenshots on any runner, so their default folder
// sits under the repo: out/smoke/shots, ignored by git. The owner sets
// SHOTS_DIR to the evidence folder. A default under one machine's home
// directory fails with EACCES on the Linux CI runner (audit CI-02).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const specs = (dir) =>
  readdirSync(join(root, dir), { recursive: true })
    .filter((f) => String(f).endsWith(".ts"))
    .map((f) => join(dir, String(f)));

test("no browser spec or helper defaults to a path under a home directory", () => {
  const home = /["'`](?:\/Users\/|\/home\/)/;
  const hits = [...specs("tools/smoke"), ...specs("tools/hook")].filter((f) => home.test(readFileSync(join(root, f), "utf8")));
  assert.deepEqual(hits, []);
});

test("SHOTS defaults to out/smoke/shots and reads SHOTS_DIR first", () => {
  const text = readFileSync(join(root, "tools/smoke/measure.ts"), "utf8");
  assert.match(text, /export const OUT = path\.join\(ROOT, "out\/smoke"\);/);
  assert.match(text, /export const SHOTS = process\.env\["SHOTS_DIR"\] \?\? path\.join\(OUT, "shots"\);/);
});

test("every spec that writes screenshots takes SHOTS from measure.ts", () => {
  for (const f of [...specs("tools/smoke"), ...specs("tools/hook")]) {
    const text = readFileSync(join(root, f), "utf8");
    if (f.endsWith("measure.ts") || !/\bSHOTS\b/.test(text)) continue;
    assert.doesNotMatch(text, /const SHOTS\s*=/, `${f} defines its own SHOTS`);
    assert.match(text, /import \{[^}]*\bSHOTS\b[^}]*\} from "(?:\.\/|\.\.\/smoke\/)measure\.ts";/, `${f} does not import SHOTS`);
  }
});
