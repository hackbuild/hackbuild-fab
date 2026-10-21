// tools/gold/side-by-side.mjs on the keys flex-pair bake against itself,
// and against tools/smoke/fixtures/overflow-400.html, a page 400 px wide
// that must fail the run at 390. Skipped when dist/bench/flex-pair.html is
// absent (node tools/bake/bake.mjs reference/keys/flex-pair/bake.json).
// Run: node --test tools/gold/side-by-side.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const BAKE = path.join(REPO, "dist/bench/flex-pair.html");
const WIDE = path.join(REPO, "tools/smoke/fixtures/overflow-400.html");
const skip = existsSync(BAKE) ? false : "dist/bench/flex-pair.html absent; bake reference/keys/flex-pair first";

function run(legacy, out) {
  const r = spawnSync(process.execPath, [path.join(HERE, "side-by-side.mjs"), "--fab", BAKE, "--legacy", legacy, "--out", out], { cwd: REPO, encoding: "utf8", timeout: 480_000 });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const sha256 = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

test("flex-pair against itself: 12 page shots, 6 joined, one json, no sideways scroll", { skip }, () => {
  const out = mkdtempSync(path.join(tmpdir(), "hbf-sbs-"));
  try {
    const r = run(BAKE, out);
    assert.equal(r.code, 0, r.out);
    const files = readdirSync(out).sort();
    const pages = files.filter((f) => /-(fab|legacy)\.png$/.test(f));
    const joined = files.filter((f) => f.endsWith(".png") && !pages.includes(f));
    assert.equal(pages.length, 12);
    assert.equal(joined.length, 6);
    assert.deepEqual(files.filter((f) => !f.endsWith(".png")), ["side-by-side.json"]);
    const rec = JSON.parse(readFileSync(path.join(out, "side-by-side.json"), "utf8"));
    assert.equal(rec.shots.length, 6);
    assert.deepEqual(rec.overflow, []);
    for (const s of rec.shots) {
      for (const img of [s.fab, s.legacy, s.sideBySide]) assert.equal(img.sha256, sha256(path.join(out, img.image)), img.image);
      for (const role of ["fab", "legacy"]) {
        assert.equal(s[role].note, undefined, `${role} ${s.width} ${s.state}: ${s[role].note}`);
        assert.equal(s[role].scrollWidth, s.width, `${role} ${s.width} ${s.state}`);
      }
    }
    assert.deepEqual(rec.shots.filter((s) => s.width === 390).map((s) => s.state), ["a-open", "b-work", "c-last"]);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("a legacy page 400 px wide fails the run at 390", { skip }, () => {
  const out = mkdtempSync(path.join(tmpdir(), "hbf-sbs-"));
  try {
    const r = run(WIDE, out);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /legacy at 390 px, a-open: scrollWidth 400 px over viewport/);
    const rec = JSON.parse(readFileSync(path.join(out, "side-by-side.json"), "utf8"));
    assert.deepEqual([...new Set(rec.overflow.map((o) => `${o.role} ${o.width} ${o.scrollWidth}`))], ["legacy 390 400"]);
    assert.equal(rec.shots.find((s) => s.width === 390 && s.state === "b-work").legacy.note, "no welcome start shown (not provided)");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("refuses an output folder outside the evidence and temp folders", () => {
  const r = spawnSync(process.execPath, [path.join(HERE, "side-by-side.mjs"), "--fab", WIDE, "--legacy", WIDE, "--out", path.join(REPO, "reference/keys/flex-pair/shots")], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 2, `${r.stdout}${r.stderr}`);
  assert.match(r.stderr, /refusing/);
  assert.equal(existsSync(path.join(REPO, "reference/keys/flex-pair/shots")), false);
});
