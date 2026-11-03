// tools/test-tiers.mjs and tools/test-tiers.json: the file's shape, that every
// listed file exists, that each tier follows from the measured duration and the
// threshold, and the generator on a scratch measurement directory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOOK_THRESHOLD_S, THRESHOLD_S, TIERS_FILE, build, groupOf, nodeTestFiles, problems, readTiers, serialize, slowFiles, tierOf } from "../test-tiers.mjs";

const root = join(import.meta.dirname, "..", "..");

test("tools/test-tiers.json has the generated shape and every listed file exists", () => {
  const tiers = readTiers(root);
  assert.ok(tiers, `${TIERS_FILE} is missing or torn; run node tools/test-tiers.mjs measure <dir> then generate <dir>`);
  assert.deepEqual(problems(tiers, root), []);
  assert.equal(tiers.measured.thresholdS, THRESHOLD_S);
  assert.equal(tiers.measured.hookThresholdS, HOOK_THRESHOLD_S);
});

test("the listed node test files are the ones npm test runs, so the glob read finds them", () => {
  const tiers = readTiers(root);
  const listed = Object.entries(tiers.files).filter(([, r]) => r.runner === "node").map(([f]) => f);
  const current = new Set(nodeTestFiles(root));
  assert.ok(current.size > 0, "no node test files found in the test script");
  for (const f of listed) assert.ok(current.has(f), `${f} is listed as a node test but npm test does not run it`);
});

test("slow rows are exactly the rows above the threshold", () => {
  const tiers = readTiers(root);
  const slow = slowFiles(tiers);
  for (const [f, r] of Object.entries(tiers.files)) assert.equal(slow.has(f), r.durationS > tiers.measured.thresholdS, f);
});

test("a hand-edited tier is reported", () => {
  const tiers = structuredClone(readTiers(root));
  const [file, row] = Object.entries(tiers.files).find(([, r]) => r.tier === "fast");
  tiers.files[file] = { ...row, tier: "slow" };
  assert.ok(problems(tiers, root).some((p) => p.startsWith(`${file}: tier slow disagrees`)));
  tiers.files["packages/none/test/gone.test.ts"] = { runner: "vitest", durationS: 1, tier: "fast" };
  assert.ok(problems(tiers, root).some((p) => p === "packages/none/test/gone.test.ts: listed but does not exist"));
  assert.ok(problems({ files: {} }, root).length > 0);
  assert.ok(problems(null, root).length > 0);
});

test("a hook threshold that is missing or below the fast threshold is reported", () => {
  const tiers = structuredClone(readTiers(root));
  delete tiers.measured.hookThresholdS;
  assert.ok(problems(tiers, root).some((p) => p.startsWith("measured.hookThresholdS ")));
  tiers.measured.hookThresholdS = tiers.measured.thresholdS - 1;
  assert.ok(problems(tiers, root).some((p) => p.startsWith("measured.hookThresholdS ")));
  tiers.measured.hookThresholdS = tiers.measured.thresholdS;
  assert.deepEqual(problems(tiers, root), []);
});

test("groupOf names the workspace of a test file", () => {
  assert.equal(groupOf("packages/geom/test/x.test.ts"), "packages/geom");
  assert.equal(groupOf("core/test/x.test.ts"), "core");
  assert.equal(groupOf("reference/keys/flex-pair/test/x.test.ts"), "reference");
  assert.equal(groupOf("tools/parity/x.test.ts"), "tools");
});

test("tierOf is slow only above the threshold", () => {
  assert.equal(tierOf(15, 15), "fast");
  assert.equal(tierOf(15.1, 15), "slow");
});

test("build reads json reporter files, tracked times where a file has them, and node timings from a measurement directory", () => {
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), "hbf-tiers-")));
  try {
    const repo = join(scratch, "repo");
    const dir = join(scratch, "meas");
    mkdirSync(join(repo, "core", "test"), { recursive: true });
    mkdirSync(join(repo, "tools", "test"), { recursive: true });
    mkdirSync(dir, { recursive: true });
    for (const f of ["core/test/a.test.ts", "core/test/b.test.ts", "tools/test/c.test.mjs"]) writeFileSync(join(repo, f), "");
    const result = (rel, ms, status = "passed") => ({ name: join(repo, rel), startTime: 1000, endTime: 1000 + ms, status, assertionResults: [] });
    writeFileSync(join(dir, "core.json"), JSON.stringify({ testResults: [result("core/test/a.test.ts", 2300), result("core/test/b.test.ts", 31000), result("packages/other/test/z.test.ts", 5)] }));
    writeFileSync(join(dir, "core.times.json"), JSON.stringify({ "core/test/a.test.ts": { totalS: 16.5, collectS: 14.2, testS: 2.3 } }));
    writeFileSync(
      join(dir, "measure.json"),
      JSON.stringify({
        date: "2026-11-02",
        host: { platform: "darwin" },
        env: [],
        commands: ["vitest run <files>"],
        vitest: [{ group: "core", report: "core.json", times: "core.times.json", files: 2, wallS: 40, exit: 0 }],
        node: [{ file: "tools/test/c.test.mjs", durationS: 16.04, exit: 0 }, { file: "tools/test/gone.test.mjs", durationS: 1, exit: 0 }],
      }),
    );
    const { tiers, warnings } = build(repo, dir, 15, 20);
    assert.deepEqual(warnings, []);
    assert.equal(tiers.measured.thresholdS, 15);
    assert.equal(tiers.measured.hookThresholdS, 20);
    assert.deepEqual(tiers.files, {
      "core/test/a.test.ts": { runner: "vitest", durationS: 16.5, tier: "slow" },
      "core/test/b.test.ts": { runner: "vitest", durationS: 31, tier: "slow" },
      "tools/test/c.test.mjs": { runner: "node", durationS: 16, tier: "slow" },
    });
    assert.deepEqual(problems(tiers, repo), []);
    const text = serialize(tiers);
    assert.deepEqual(JSON.parse(text), JSON.parse(JSON.stringify(tiers)));
    assert.equal(text.split("\n").filter((l) => l.includes('"runner"')).length, 3, "one line per file");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("build has no report for a group, so its files are not listed and a warning says so", () => {
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), "hbf-tiers-")));
  try {
    writeFileSync(join(scratch, "measure.json"), JSON.stringify({ date: "2026-11-02", host: {}, commands: ["x"], vitest: [{ group: "core", report: "core.json" }], node: [] }));
    const { tiers, warnings } = build(scratch, scratch, 15);
    assert.deepEqual(tiers.files, {});
    assert.match(warnings[0], /^core: report core\.json is missing or torn/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
