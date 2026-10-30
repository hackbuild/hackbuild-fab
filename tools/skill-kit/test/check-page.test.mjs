// check-page against BAIL (flagged), a baked bench (passes) and the CDN
// fixture pointed at release urls (passes). No network: the page text is read
// from disk and the release urls are only matched, never fetched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../../lib/outputs.mjs";
import { checkPage } from "../check-page.mjs";
import { familyVersion } from "../family.mjs";
import { pointAtRelease, releaseFileFor } from "../release-page.mjs";

// The owner's evidence archive sits beside this repository (CLAUDE.md, fab-knowledge:).
const BAIL = process.env["HBF_BAIL_HTML"] ?? join(ROOT, "..", "fab-knowledge", "originals", "bail", "files", "bail.html");
const byId = (rs) => Object.fromEntries(rs.map((r) => [r.id, r]));

test("BAIL is flagged for no libraries, a 3MF writer, a mesh kernel and a shell", { skip: !existsSync(BAIL) && "not run: the BAIL original is outside this checkout" }, () => {
  const r = byId(checkPage(readFileSync(BAIL, "utf8")));
  assert.equal(r["libraries"].ok, false);
  assert.equal(r["own-3mf-writer"].ok, false);
  assert.match(r["own-3mf-writer"].line, /Orca3MF/);
  assert.equal(r["own-mesh-kernel"].ok, false);
  assert.match(r["own-mesh-kernel"].line, /RasterMesh/);
  assert.equal(r["own-bench-shell"].ok, false);
  assert.equal(r["bench-hook"].ok, true, "BAIL does define BENCH");
});

const BAKES = ["dist/art-board/art-board.html", "dist/bench/toggle.html"].map((p) => join(ROOT, p)).filter((p) => existsSync(p));
test("a baked bench on the library iife builds passes", { skip: BAKES.length === 0 && "not run: no baked bench in dist" }, () => {
  const v = familyVersion();
  const fresh = BAKES.filter((p) => readFileSync(p, "utf8").includes(`iife build, global HackbuildBench */`) && readFileSync(p, "utf8").includes(`@hackbuild/bench ${v},`));
  assert.ok(fresh.length > 0, `no bake in dist carries @hackbuild/bench ${v}; rebake after build:lib`);
  for (const p of fresh) {
    const rs = checkPage(readFileSync(p, "utf8"));
    assert.deepEqual(rs.filter((r) => !r.ok), [], p);
  }
});

const FIXTURE = join(ROOT, "tools/fixtures/cdn/index.html");
test("the CDN fixture pointed at release urls passes", () => {
  const html = pointAtRelease(readFileSync(FIXTURE, "utf8"));
  assert.match(html, /cdn\.jsdelivr\.net\/gh\/hackbuild\/hackbuild-fab@lib-v\d+\.\d+\.\d+\/packages\/bench\/dist\/cdn\/bench\.js/);
  assert.ok(!html.includes("/out/publish/"), "every library url is a release url");
  const rs = checkPage(html);
  assert.deepEqual(rs.filter((r) => !r.ok), []);
});

test("the local fixture, which loads staged builds, is refused for its libraries", () => {
  const rs = byId(checkPage(readFileSync(FIXTURE, "utf8")));
  assert.equal(rs["libraries"].ok, false);
});

test("an unpublished version, a moving ref and a missing hook are each refused", () => {
  const good = pointAtRelease(readFileSync(FIXTURE, "utf8"));
  const v = familyVersion();
  const other = byId(checkPage(good.split(`lib-v${v}`).join("lib-v9.9.9")));
  assert.equal(other["libraries"].ok, false);
  assert.match(other["libraries"].line, /9\.9\.9 is not published/);
  const moving = byId(checkPage(good.split(`lib-v${v}`).join("main")));
  assert.equal(moving["libraries"].ok, false);
  const nohook = byId(checkPage(good.replace("hook: true", "hook: false")));
  assert.equal(nohook["bench-hook"].ok, false);
});

test("an inline script that differs from its sidecar is refused", { skip: !existsSync(join(ROOT, "dist/art-board/art-board.html")) && "not run: dist/art-board is absent" }, () => {
  const html = readFileSync(join(ROOT, "dist/art-board/art-board.html"), "utf8");
  const at = html.indexOf("iife build, global HackbuildSpec */\n") + "iife build, global HackbuildSpec */\n".length;
  const bad = `${html.slice(0, at)}/* edited */${html.slice(at)}`;
  const r = byId(checkPage(bad));
  assert.equal(r["libraries"].ok, false);
  assert.match(r["libraries"].line, /does not match/);
});

test("release urls map back to files of this checkout", () => {
  const v = familyVersion();
  const f = releaseFileFor(`https://cdn.jsdelivr.net/gh/hackbuild/hackbuild-fab@lib-v${v}/spec/dist/cdn/spec.js`);
  assert.equal(f, join(ROOT, "spec/dist/cdn/spec.js"));
  assert.equal(releaseFileFor(`https://cdn.jsdelivr.net/gh/hackbuild/hackbuild-fab@lib-v${v}/package.json`), null);
});
