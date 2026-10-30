// docs/skill/LIBRARIES.md is generated; this fails when the committed copy is
// stale against a fresh generation from the built files. Needs build:lib.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGES, ROOT } from "../../lib/outputs.mjs";
import { familyVersion, REFERENCE_PATH, releaseFiles, tagOf } from "../family.mjs";
import { checkPage } from "../check-page.mjs";
import { generate, iifeOrder } from "../reference.mjs";

const built = PACKAGES.every((p) => existsSync(join(ROOT, p.dir, "dist/iife", `${p.short}.js`))) && existsSync(join(ROOT, "packages/bench-core/dist/export/selfcheck.d.ts"));

test("every published package holds the one family version", () => {
  assert.match(familyVersion(), /^\d+\.\d+\.\d+$/);
  assert.equal(tagOf("0.1.0"), "lib-v0.1.0");
});

test("the release file list is derived from the package table", () => {
  const paths = releaseFiles().map((f) => f.path);
  for (const p of PACKAGES) {
    assert.ok(paths.includes(`${p.dir}/dist/cdn/${p.short}.js`), `${p.short} cdn`);
    assert.ok(paths.includes(`${p.dir}/dist/iife/${p.short}.js`), `${p.short} iife`);
    assert.ok(paths.includes(`${p.dir}/dist/iife/${p.short}.sources.json`), `${p.short} sidecar`);
  }
  assert.ok(paths.includes("tools/vendor/three/dist/three.js"));
});

test("the iife load order reads peers first and bench last", { skip: !built && "not run: build:lib output is absent" }, () => {
  const order = iifeOrder(ROOT);
  assert.deepEqual(order, ["vue", "pinia", "three", "@hackbuild/spec", "@hackbuild/viewer", "@hackbuild/bench-core", "@hackbuild/bench"]);
});

test("LIBRARIES.md equals a fresh generation", { skip: !built && "not run: build:lib output is absent", timeout: 60_000 }, async () => {
  const fresh = await generate(ROOT);
  const file = join(ROOT, REFERENCE_PATH);
  assert.ok(existsSync(file), `${REFERENCE_PATH} is missing. run npm run skill:reference.`);
  assert.equal(readFileSync(file, "utf8"), fresh, `${REFERENCE_PATH} is stale. run npm run skill:reference.`);
});

test("LIBRARIES.md holds the sections a bench author needs", { skip: !built && "not run: build:lib output is absent" }, async () => {
  const text = await generate(ROOT);
  for (const h of ["## Packages and versions", "## Files, urls and integrity", "## Import map for the cdn files", "## Classic scripts (IIFE) load order and globals", "## createBench", "## The BENCH hook", "## The art document and its layer kinds", "## Export path and self-check", "## Minimal page, import map", "## Minimal page, classic scripts"]) assert.ok(text.includes(h), h);
  assert.match(text, /https:\/\/cdn\.jsdelivr\.net\/gh\/hackbuild\/hackbuild-fab@lib-v\d+\.\d+\.\d+\/spec\/dist\/cdn\/spec\.js/);
  assert.match(text, /sha384-[A-Za-z0-9+/]{64}/);
});

test("the two minimal pages pass check-page", { skip: !built && "not run: build:lib output is absent" }, async () => {
  const pages = [...(await generate(ROOT)).matchAll(/```html\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.equal(pages.length, 2);
  for (const html of pages) assert.deepEqual(checkPage(html).filter((r) => !r.ok), []);
});
