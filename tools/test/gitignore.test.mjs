// Run outputs and scratch bundles stay out of git status, so the verifier row
// "no unstaged or untracked source files" reads source only. The artboard
// smoke (tools/py/harness/artboard_smoke.py) documents `out/artboard` at the
// repo root as its output dir; a `*.tmp.mjs` is a throwaway esbuild bundle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const ignored = (p) => {
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", p], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

test("root out/ and *.tmp.mjs scratch bundles are ignored", () => {
  assert.equal(ignored("out/artboard/artboard-390.png"), true);
  assert.equal(ignored("packages/sim/bench.tmp.mjs"), true);
});

test("the ignore rules leave source and nested out dirs of packages alone", () => {
  assert.equal(ignored("packages/sim/bench.mjs"), false);
  assert.equal(ignored("packages/mesh/src/out/index.ts"), false);
  assert.equal(ignored("tools/py/harness/artboard_smoke.py"), false);
});

test("no tracked or staged file matches an ignore rule", () => {
  const hits = execFileSync("git", ["ls-files", "-ci", "--exclude-standard"], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(hits, "");
});
