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
  for (const m of text.matchAll(/uses: (actions\/[\w-]+)(?:\/[\w-]+)?@v(\d+)/g)) {
    const min = { checkout: 5, "setup-node": 5, "upload-artifact": 6, "download-artifact": 7, cache: 5 }[m[1].slice("actions/".length)];
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

test("the parity loop runs every reference and every design with goldens before it fails", () => {
  const loop = runs("parity").find((r) => r.includes("for d in reference/*/*/"));
  assert.ok(loop, "parity runs the reference loop");
  assert.match(loop, /for d in reference\/\*\/\*\/ designs\/\*\/;/, "the loop covers designs too");
  assert.ok(loop.includes('designs/*) test -f "${d}expected/build.json" || continue'), "a design runs only when it keeps goldens");
  const body = loop.slice(loop.indexOf("for d in"), loop.indexOf("done"));
  assert.ok(!/\bexit\b/.test(body), "no exit inside the loop");
  assert.match(loop, /exit \$status\s*$/);
});

test("hosted vitest runs exclude the owner files; the owner-files job runs them by hand only", () => {
  const r = runs("exit-a").join("\n");
  assert.ok(r.includes("owner-files.mjs report"), "exit-a prints the not-run list");
  assert.ok(r.includes("$(node .github/scripts/owner-files.mjs excludes)"), "exit-a excludes the owner files");
  for (const line of text.split("\n").filter((l) => /npx vitest run (packages|designs|tools\/parity|core)( |$)/.test(l))) {
    assert.ok(line.includes("owner-files.mjs excludes"), `excludes on: ${line.trim()}`);
  }
  const job = ci.jobs["owner-files"];
  assert.ok(!runs("unit").some((r) => /vitest|npm test/.test(r)), "unit runs no vitest; exit-a runs the package, core and kernel files once");
  assert.ok(!/npm test --workspaces/.test(text), "no step runs every workspace test script");
  assert.equal(job.if, "github.event_name == 'workflow_dispatch'");
  assert.deepEqual(job["runs-on"], ["self-hosted", "macOS"]);
  assert.ok(job.steps.some((s) => (s.run ?? "").includes("$(node .github/scripts/owner-files.mjs list)")));
});

// BR-03: a job whose steps reach uv sets it up first. Direct `uv run` steps
// are found by text; the jobs below reach uv through the code they run: the
// pytest runner test (unit), the 3mf agreement, board generator and split
// tests (exit-a), the board references of the cold rebuild (cold), the
// sprue parity test and the reference loop (parity), the board builds
// (exit-m06-m08).
const SPAWNS_UV = { unit: "node --test tools/test/", "exit-a": "npx vitest", cold: "node tools/cold-rebuild.mjs", parity: "npx vitest run tools/parity", "exit-m06-m08": "hbf part.build reference/boards" };

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

// R1 rails: the small jobs live in build (typecheck, derived, tiers,
// contract, seed, property, vtracer-eval) and bake (ui-css, size); the
// cold and determinism jobs stay their own so they stay cold.
const JOBS = ["house-rules", "build", "unit", "exit-a", "corpus", "parity", "exit-m06-m08", "dxf-audit", "determinism", "determinism-compare", "cold", "bake", "bake-determinism", "browser", "owner-files"];

test("the job keys are the merged set", () => {
  assert.deepEqual(Object.keys(ci.jobs), JOBS);
});

test("house-rules alone runs lint-commits and lint-authors", () => {
  const names = (job) => ci.jobs[job].steps.map((s) => s.name ?? "");
  for (const cmd of ["node tools/lint-commits.mjs", "node tools/lint-authors.mjs"]) {
    assert.ok(runs("house-rules").includes(cmd), `house-rules runs ${cmd}`);
    for (const job of Object.keys(ci.jobs).filter((j) => j !== "house-rules")) {
      assert.ok(!runs(job).some((r) => r.includes(cmd)), `${job} runs ${cmd}`);
    }
  }
  assert.ok(names("house-rules").includes("lint-commits") && names("house-rules").includes("lint-authors"));
});

test("build checks the tree is clean before any step that can write to it", () => {
  const clean = at("build", (s) => (s.run ?? "").includes('test -z "$(git status --porcelain)"'));
  const regen = ["node tools/counts.mjs", "npx tsc -b", "node tools/gen-check-pages.mjs"].map((r) => at("build", (s) => s.run === r));
  const writers = ci.jobs.build.steps.map((s, i) => [i, s.run ?? ""]).filter(([, r]) => /npx vitest|npm run sweep|npm ci --prefix|uv run|node --test|tools\/eval\//.test(r));
  assert.ok(clean >= 0, "build has the derived clean check");
  for (const i of regen) assert.ok(i >= 0 && i < clean, `regeneration step ${i} precedes the clean check ${clean}`);
  for (const [i, r] of writers.filter(([i]) => i > regen[0])) assert.ok(i > clean, `step ${i} (${r.split("\n")[0]}) runs before the clean check ${clean}`);
  assert.ok(writers.filter(([i]) => i > clean).length >= 6, "the checks after the clean check are present");
});

test("every build check after the first reports even when one before it failed", () => {
  const steps = ci.jobs.build.steps;
  const install = steps.findIndex((s) => s.run === "npm ci");
  assert.equal(steps[install].id, "install");
  for (const s of steps.slice(install + 2)) assert.match(s.if ?? "", /!cancelled\(\) && steps\.install\.outcome == 'success'/, s.name);
  for (const prefix of ["derived:", "typecheck:", "tiers:", "contract:", "seed:", "property:", "vtracer-eval:"]) {
    assert.ok(steps.some((s) => (s.name ?? "").startsWith(prefix)), `a step named ${prefix}`);
  }
});

test("bake runs ui-css and size before it uploads", () => {
  const css = at("bake", (s) => s.run === "node tools/bake/check-ui-css.mjs");
  const size = at("bake", (s) => (s.run ?? "").includes("16777216"));
  const upload = at("bake", (s) => /^actions\/upload-artifact@/.test(s.uses ?? ""));
  const bake = at("bake", (s) => s.run === "npm run bake:all");
  assert.ok(bake >= 0 && bake < css && css < upload && bake < size && size < upload, `bake ${bake}, ui-css ${css}, size ${size}, upload ${upload}`);
});

// R1 rails caches. tsc build info and dist are saved by build alone and
// restored elsewhere; cold, bake-determinism and determinism build from
// nothing, so none restores them. Every setup-uv caches on the uv lock.
const isCache = (s) => /^actions\/cache(\/restore)?@/.test(s.uses ?? "");
const isTscCache = (s) => isCache(s) && /tsbuildinfo/.test(String(s.with?.path ?? ""));
const TSC_RESTORED = ["build", "unit", "exit-a", "corpus", "parity", "exit-m06-m08", "dxf-audit", "browser"];

test("tsc build info is restored in the build-from-cache jobs, saved by build only, before npm ci", () => {
  for (const [name, job] of Object.entries(ci.jobs)) {
    const i = job.steps.findIndex(isTscCache);
    if (!TSC_RESTORED.includes(name)) {
      assert.equal(i, -1, `${name} restores the tsc cache`);
      continue;
    }
    assert.ok(i >= 0, `${name} restores the tsc cache`);
    const install = job.steps.findIndex((s) => s.run === "npm ci");
    assert.ok(i < install, `${name}: tsc cache at step ${i}, npm ci (core prepare runs tsc -b) at ${install}`);
    const s = job.steps[i];
    assert.equal(s.uses, name === "build" ? "actions/cache@v5" : "actions/cache/restore@v5", `${name} writer`);
    assert.match(s.with.key, /^tsc-\$\{\{ hashFiles\(.*\) \}\}-\$\{\{ github\.sha \}\}$/);
    assert.equal(s.with["restore-keys"], s.with.key.replace("${{ github.sha }}", ""));
    assert.ok(s.with.path.includes("!**/node_modules/**"), `${name} excludes node_modules`);
  }
});

test("cold, bake-determinism and determinism restore no build output", () => {
  for (const name of ["cold", "bake-determinism"]) {
    assert.ok(!ci.jobs[name].steps.some(isCache), `${name} has a cache step`);
  }
  for (const s of ci.jobs.determinism.steps.filter(isCache)) {
    assert.equal(s.with.path, "~/.cache/ms-playwright", "determinism caches browsers only");
    assert.equal(s.if, "matrix.kind == 'browser'");
  }
});

test("every setup-uv caches on the uv lock", () => {
  let n = 0;
  for (const [name, job] of Object.entries(ci.jobs)) {
    for (const s of job.steps.filter((s) => /^astral-sh\/setup-uv@/.test(s.uses ?? ""))) {
      n++;
      assert.equal(s.with?.["enable-cache"], true, `${name}: enable-cache`);
      assert.equal(s.with?.["cache-dependency-glob"], "tools/py/uv.lock", `${name}: cache-dependency-glob`);
    }
  }
  assert.ok(n > 0, "a setup-uv step exists");
});

test("a Playwright browser cache hit installs system packages only", () => {
  for (const [name, job] of Object.entries(ci.jobs)) {
    for (const s of job.steps.filter((s) => isCache(s) && /ms-playwright/.test(String(s.with?.path)))) {
      assert.ok(s.id, `${name}: the browser cache step has an id`);
      const after = job.steps.map((t) => `${t.if ?? ""}\n${t.run ?? ""}\n${JSON.stringify(t.env ?? {})}`).join("\n");
      assert.ok(after.includes(`steps.${s.id}.outputs.cache-hit`), `${name} reads ${s.id} cache-hit`);
      assert.match(s.with.key, /^pw-/);
    }
  }
  assert.ok(runs("browser").includes("npx playwright install --with-deps chrome"), "browser keeps system Chrome uncached");
});
