// M00-T14: tools/determinism/compare.mjs fails on a required id that
// differs or is missing, records zip ids without failing, and with
// --subset reads only the ids of the right file.

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { diff } from "../determinism/compare.mjs";


// every temp folder this file makes is removed when the file's tests end
const TEMPS = [];
const keep = (d) => {
  TEMPS.push(d);
  return d;
};
after(() => {
  for (const d of TEMPS) rmSync(d, { recursive: true, force: true });
});
const CMP = fileURLToPath(new URL("../determinism/compare.mjs", import.meta.url));

function run(a, b, ...flags) {
  const dir = keep(mkdtempSync(path.join(tmpdir(), "hbf-compare-")));
  const fa = path.join(dir, "a.json");
  const fb = path.join(dir, "b.json");
  writeFileSync(fa, JSON.stringify(a));
  writeFileSync(fb, JSON.stringify(b));
  return spawnSync(process.execPath, [CMP, ...flags, fa, fb], { encoding: "utf8" });
}

test("diff names differing and one-sided ids, sorted", () => {
  assert.deepEqual(diff({ b: "1", a: "1", c: "2" }, { a: "1", b: "2", d: "3" }), ["b", "c", "d"]);
  assert.deepEqual(diff({ a: "1", c: "2" }, { a: "1" }, { subset: true }), []);
});

test("equal files exit 0", () => {
  const r = run({ "mesh:x#a": "1", "zip:x#3mf": "z" }, { "zip:x#3mf": "z", "mesh:x#a": "1" });
  assert.equal(r.status, 0, r.stdout);
});

test("a differing mesh id exits 1 and prints the id and pair", () => {
  const r = run({ "mesh:x#a": "1" }, { "mesh:x#a": "2" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^differs mesh:x#a 1 2$/m);
});

test("a missing id exits 1", () => {
  const r = run({ "route:prism/rect/0": "1", "artifact:x#3mf": "h" }, { "route:prism/rect/0": "1" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^differs artifact:x#3mf h missing$/m);
});

test("a zip id that differs is recorded and exits 0", () => {
  const r = run({ "zip:x#3mf": "a" }, { "zip:x#3mf": "b" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^recorded zip:x#3mf a b$/m);
});

test("--subset ignores ids only the left file holds", () => {
  assert.equal(run({ "mesh:x#a": "1", "ring:circle/003": "r" }, { "ring:circle/003": "r" }, "--subset").status, 0);
  assert.equal(run({ "ring:circle/003": "r" }, { "ring:circle/003": "s" }, "--subset").status, 1);
});

test("a missing argument exits 2", () => {
  assert.equal(spawnSync(process.execPath, [CMP, "only.json"], { encoding: "utf8" }).status, 2);
});
