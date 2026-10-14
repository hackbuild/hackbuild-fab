// Shape of .github/workflows/ci.yml where a step bug went unseen before the
// first push (S-07, CI-01, CI-03, CI-04, CI-05 of the publish audit). The
// exit-a file name is read from the built core, so it follows partName.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";

const root = join(import.meta.dirname, "..", "..");
const text = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
const ci = parse(text);
const runs = (job) => ci.jobs[job].steps.map((s) => s.run ?? "");
const at = (job, pred) => ci.jobs[job].steps.findIndex(pred);

test("triggers: push to main, pull requests, manual; one run per ref", () => {
  assert.deepEqual(ci.on.push, { branches: ["main"] });
  assert.ok("pull_request" in ci.on);
  assert.ok("workflow_dispatch" in ci.on);
  assert.match(ci.concurrency.group, /github\.ref/);
});

test("no action runs at a node20 major", () => {
  for (const m of text.matchAll(/uses: (actions\/[\w-]+)@v(\d+)/g)) {
    const min = { checkout: 5, "setup-node": 5, "upload-artifact": 6, "download-artifact": 7 }[m[1].slice("actions/".length)];
    assert.ok(min !== undefined, `${m[1]} has a node24 floor here`);
    assert.ok(Number(m[2]) >= min, `${m[0]} is below v${min}, the first node24 major`);
  }
});

test("house-rules builds the 3mf reader before lint-voice", () => {
  const ci_ = at("house-rules", (s) => s.run === "npm ci");
  const tsc = at("house-rules", (s) => s.run === "npx tsc -b");
  const lint = at("house-rules", (s) => s.run === "node tools/lint-voice.mjs");
  assert.ok(ci_ >= 0 && tsc > ci_ && lint > tsc, `npm ci ${ci_}, tsc ${tsc}, lint-voice ${lint}`);
});

test("exit-a tests and validates the file the gated export writes", async () => {
  const names = join(root, "core/dist/exporters/names.js");
  assert.ok(existsSync(names), "core is built (npx tsc -b)");
  const { register } = await import("node:module");
  // core/dist imports @hackbuild/spec, whose export is TypeScript source; the hook maps it to dist
  register(pathToFileURL(join(root, "core/dist/resolve-hook.js")).href, import.meta.url);
  const { partName } = await import(pathToFileURL(names).href);
  const want = `reference/keys/flex-pair/out/${partName("flex-pair", 1, "3mf")}`;
  const steps = runs("exit-a").join("\n");
  assert.ok(steps.includes(`test -f ${want}`), `exit-a tests ${want}`);
  assert.ok(steps.includes(`validate_3mf.py --overlap ${want}`), `exit-a validates ${want}`);
  assert.ok(!/out\/flex-pair\.3mf/.test(steps), "no step names out/flex-pair.3mf");
});

test("the parity reference loop runs every reference before it fails", () => {
  const loop = runs("parity").find((r) => r.includes("for d in reference/*/*/"));
  assert.ok(loop, "parity runs the reference loop");
  const body = loop.slice(loop.indexOf("for d in"), loop.indexOf("done"));
  assert.ok(!/\bexit\b/.test(body), "no exit inside the loop");
  assert.match(loop, /exit \$status\s*$/);
});

test("hosted vitest runs exclude the owner files; the owner-files job runs them by hand only", () => {
  for (const job of ["unit", "exit-a"]) {
    const r = runs(job).join("\n");
    assert.ok(r.includes("owner-files.mjs report"), `${job} prints the not-run list`);
    assert.ok(r.includes("$(node .github/scripts/owner-files.mjs excludes)"), `${job} excludes the owner files`);
  }
  for (const line of text.split("\n").filter((l) => /npx vitest run (packages|designs|tools\/parity|core)( |$)/.test(l))) {
    assert.ok(line.includes("owner-files.mjs excludes"), `excludes on: ${line.trim()}`);
  }
  const job = ci.jobs["owner-files"];
  assert.equal(job.if, "github.event_name == 'workflow_dispatch'");
  assert.deepEqual(job["runs-on"], ["self-hosted", "macOS"]);
  assert.ok(job.steps.some((s) => (s.run ?? "").includes("$(node .github/scripts/owner-files.mjs list)")));
});

// BR-03: a job whose steps reach uv sets it up first. Direct `uv run` steps
// are found by text; the jobs below reach uv through the code they run: the
// 3mf agreement, board generator and split tests (unit, exit-a), the board
// references of the cold rebuild (cold), the sprue parity test and the
// reference loop (parity), the board builds (exit-m06-m08).
const SPAWNS_UV = { unit: "npm test", "exit-a": "npx vitest", cold: "node tools/cold-rebuild.mjs", parity: "npx vitest run tools/parity", "exit-m06-m08": "hbf part.build reference/boards" };

test("every job that reaches uv sets up uv before the first step that does", () => {
  const isSetup = (s) => /^astral-sh\/setup-uv@/.test(s.uses ?? "");
  for (const [name, job] of Object.entries(ci.jobs)) {
    const marker = SPAWNS_UV[name];
    const first = job.steps.findIndex((s) => /(^|[\s;&|(])uv run /.test(s.run ?? "") || (marker !== undefined && (s.run ?? "").includes(marker)));
    if (marker !== undefined) assert.ok(first >= 0, `${name} still runs ${marker}`);
    if (first < 0) continue;
    const setup = job.steps.findIndex(isSetup);
    assert.ok(setup >= 0 && setup < first, `${name}: setup-uv at step ${setup}, first uv step at ${first}`);
  }
});
