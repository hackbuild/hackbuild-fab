// docs/skill/LIBRARIES.md is generated; this fails when the committed copy is
// stale against a fresh generation from the built files. Needs build:lib.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGES, ROOT } from "../../lib/outputs.mjs";
import { familyVersion, REFERENCE_PATH, releaseFiles, tagOf } from "../family.mjs";
import { checkPage } from "../check-page.mjs";
import { generate, iifeOrder, interfaceMembers } from "../reference.mjs";

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

test("a page that builds loads the engine after spec and before the viewer", { skip: !built && "not run: build:lib output is absent" }, () => {
  assert.deepEqual(iifeOrder(ROOT, ["@hackbuild/bench", "@hackbuild/engine"]), ["vue", "pinia", "three", "@hackbuild/spec", "@hackbuild/engine", "@hackbuild/viewer", "@hackbuild/bench-core", "@hackbuild/bench"]);
});

test("LIBRARIES.md equals a fresh generation", { skip: !built && "not run: build:lib output is absent", timeout: 60_000 }, async () => {
  const fresh = await generate(ROOT);
  const file = join(ROOT, REFERENCE_PATH);
  assert.ok(existsSync(file), `${REFERENCE_PATH} is missing. run npm run skill:reference.`);
  assert.equal(readFileSync(file, "utf8"), fresh, `${REFERENCE_PATH} is stale. run npm run skill:reference.`);
});

test("LIBRARIES.md holds the sections a bench author needs", { skip: !built && "not run: build:lib output is absent" }, async () => {
  const text = await generate(ROOT);
  for (const h of ["## Packages and versions", "## Files, urls and integrity", "## Import map for the cdn files", "## Classic scripts (IIFE) load order and globals", "## The engine", "## Writing a build", "### The author calls", "### Worked build 1: coin-inlay", "### Worked build 2: art-layers", "## createBench", "## The BENCH hook", "## The art document and its layer kinds", "## Export path and self-check", "## Minimal page, import map", "## Minimal page, classic scripts"]) assert.ok(text.includes(h), h);
  assert.match(text, /https:\/\/cdn\.jsdelivr\.net\/gh\/hackbuild\/hackbuild-fab@lib-v\d+\.\d+\.\d+\/spec\/dist\/cdn\/spec\.js/);
  assert.match(text, /sha384-[A-Za-z0-9+/]{64}/);
});

test("the two minimal pages pass check-page", { skip: !built && "not run: build:lib output is absent" }, async () => {
  const pages = [...(await generate(ROOT)).matchAll(/```html\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.equal(pages.length, 2);
  for (const html of pages) assert.deepEqual(checkPage(html).filter((r) => !r.ok), []);
});

test("LIBRARIES.md lists every author call and sends a page to createPageBuild", { skip: !built && "not run: build:lib output is absent" }, () => {
  const text = readFileSync(join(ROOT, REFERENCE_PATH), "utf8");
  const calls = interfaceMembers(readFileSync(join(ROOT, "spec/dist/build.d.ts"), "utf8"), "Author").map((m) => m.name);
  assert.ok(calls.length >= 14, `the Author interface gave ${calls.length} calls`);
  for (const name of calls) assert.ok(text.includes(`k.${name}`), `k.${name}`);
  assert.ok(text.includes("export const build = defineBuild(chase"), "a worked build is verbatim");
  assert.ok(text.includes("createPageBuild") && text.includes("factsFor"));
  assert.ok(!text.includes("A design's build comes from its page build"), "the advice that sent a page to build:design is replaced");
});
