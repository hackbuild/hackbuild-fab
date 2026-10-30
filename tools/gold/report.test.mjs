// tools/gold/report.mjs against fixture inputs (TESTING.md 8.5 Report,
// Tests): one case per grading branch. The all-pass fixture under
// tools/gold/test/all-pass holds one passing result for every rule of the
// committed TESTING.md 8.5 tables on bench `fx`; each case copies it to a
// temporary root and breaks one input.
// Run: node --test tools/gold/report.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseIds, parseRules } from "./report.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const FIXTURE = path.join(HERE, "test/all-pass");

function root() {
  const dir = mkdtempSync(path.join(tmpdir(), "hbf-gold-"));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

function run(dir, ...args) {
  const r = spawnSync(process.execPath, [path.join(HERE, "report.mjs"), "--root", dir, ...args], { encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const edit = (dir, rel, fn) => {
  const file = path.join(dir, rel);
  writeFileSync(file, `${JSON.stringify(fn(JSON.parse(readFileSync(file, "utf8"))), null, 1)}\n`);
};

/** Sets the Playwright result of one rule on bench fx. */
const playwright = (dir, id, status, message = "") =>
  edit(dir, "out/smoke/gold-playwright.json", (j) => {
    for (const s of j.suites[0].specs) if (s.title.startsWith(`${id} `)) s.tests[0].results = [{ status, errors: message === "" ? [] : [{ message }] }];
    return j;
  });

test("the rule table parses 57 rows with their harnesses", () => {
  const rules = parseRules(readFileSync(path.join(REPO, "docs/plan/TESTING.md"), "utf8"));
  assert.equal(rules.length, 57);
  assert.deepEqual(rules.find((r) => r.id === "G-37")?.harness, ["hook", "static"]);
  assert.equal(rules.find((r) => r.id === "G-21")?.touch, true);
  assert.equal(rules.find((r) => r.id === "G-28")?.chk, "CHK-SHP-06");
  assert.deepEqual([...parseIds("G-03..G-06,G-10")], ["G-03", "G-04", "G-05", "G-06", "G-10"]);
});

test("an all-pass bench prints 57 of 57 and exits 0", () => {
  const dir = root();
  try {
    const r = run(dir);
    assert.equal(r.code, 0, r.err);
    assert.equal(r.out.trim().split("\n")[0], "gold fx 57 of 57");
    const rep = JSON.parse(readFileSync(path.join(dir, "out/gold/report.json"), "utf8"));
    assert.equal(rep.benches[0].rows.length, 57);
    assert.equal(rep.benches[0].buildHash, "fixture-hash-1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an n/a row without a reason is bad input, exit 2", () => {
  const dir = root();
  try {
    edit(dir, "out/smoke/gold.json", (j) => ((j.benches[0].rules["G-19"] = { applies: false }), j));
    const r = run(dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /G-19 is n\/a without a reason/);
    edit(dir, "out/smoke/gold.json", (j) => ((j.benches[0].rules["G-19"] = { applies: false, reason: "no contact model" }), j));
    const ok = run(dir);
    assert.equal(ok.code, 0);
    assert.match(ok.out, /^n\/a G-19: no contact model$/m);
    assert.match(ok.out, /^gold fx 56 of 56, n\/a 1, not run 0, fail 0$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing Playwright report grades hook and smoke rows not run, exit 1", () => {
  const dir = root();
  try {
    rmSync(path.join(dir, "out/smoke/gold-playwright.json"));
    const r = run(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /^not run G-11 hook: missing out\/smoke\/gold-playwright\.json$/m);
    const rep = JSON.parse(readFileSync(path.join(dir, "out/gold/report.json"), "utf8"));
    assert.equal(rep.benches[0].rows.find((x) => x.id === "G-07").verdict, "pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("G-37 with the hook half passing and the static half failing grades fail", () => {
  const dir = root();
  try {
    edit(dir, "out/lint/gold-static.json", (j) => ((j.benches.fx[0] = { id: "G-37", check: "CHK-LNT-06", result: "fail", message: "alert() at line 9" }), j));
    const r = run(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /^fail G-37 static: alert\(\) at line 9$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a test titled with an id the table lacks is bad input, exit 2", () => {
  const dir = root();
  try {
    edit(dir, "out/smoke/gold-playwright.json", (j) => ((j.suites[0].specs[0].title = "G-99 not a rule [fx] @gold"), j));
    const r = run(dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /G-99, which TESTING\.md 8\.5 lacks/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a rule with no test in a present input is bad input: no harness for G-xx", () => {
  const dir = root();
  try {
    edit(dir, "out/smoke/gold-playwright.json", (j) => ((j.suites[0].specs = j.suites[0].specs.filter((s) => !s.title.startsWith("G-51 "))), j));
    const r = run(dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /no harness for G-51/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--only lets a fail outside the list exit 0 and a fail inside it exit 1", () => {
  const dir = root();
  try {
    playwright(dir, "G-12", "failed", "NaN in an input");
    assert.equal(run(dir).code, 1);
    const r = run(dir, "--only", "G-03..G-06,G-51");
    assert.equal(r.code, 0);
    assert.match(r.out, /^fail G-12 hook: NaN in an input$/m);
    playwright(dir, "G-04", "failed", "3 builds");
    assert.equal(run(dir, "--only", "G-03..G-06,G-51").code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--origin fab grades the fab bakes only; a legacy page with fails stays out of the zero-fail run (D-265)", () => {
  const dir = root();
  try {
    edit(dir, "out/smoke/gold.json", (j) => ({ ...j, benches: [{ ...j.benches[0], origin: "fab" }, { id: "lg", origin: "legacy", buildHash: null, rules: {} }] }));
    edit(dir, "out/smoke/gold-playwright.json", (j) => {
      const s0 = j.suites[0];
      const g03 = s0.specs.find((x) => x.title.startsWith("G-03 "));
      s0.specs.push({ ...g03, title: g03.title.replace("[fx]", "[lg]"), tests: [{ ...g03.tests[0], annotations: [{ type: "bench", description: "lg" }], results: [{ status: "failed", errors: [{ message: "chip after input without change" }] }] }] });
      return j;
    });
    assert.equal(run(dir, "--only", "G-03").code, 1, "the legacy fail counts without --origin");
    const fab = run(dir, "--only", "G-03", "--origin", "fab");
    assert.equal(fab.code, 0, fab.out + fab.err);
    const rep = JSON.parse(readFileSync(path.join(dir, "out/gold/report.json"), "utf8"));
    assert.deepEqual(rep.benches.map((b) => b.bench), ["fx"]);
    assert.equal(run(dir, "--origin", "kit").code, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a timeout grades not run with hang; a skip carries its reason; person rows wait on looked.json", () => {
  const dir = root();
  try {
    playwright(dir, "G-10", "timedOut");
    edit(dir, "out/review/looked.json", () => []);
    const r = run(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /^not run G-10 hook: hang$/m);
    assert.match(r.out, /^not run G-24 person: pending$/m);
    const rep = JSON.parse(readFileSync(path.join(dir, "out/gold/report.json"), "utf8"));
    assert.equal(rep.benches[0].rows.find((x) => x.id === "G-24").verdict, "person pending");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a known failure grades fail without failing the run, and fails the run once it passes", () => {
  const dir = root();
  try {
    const known = (rows) => writeFileSync(path.join(dir, "tools/gold/known.json"), `${JSON.stringify({ rows })}\n`);
    playwright(dir, "G-10", "failed", "build failed: E_KERNEL");
    assert.equal(run(dir, "--only", "G-10").code, 1, "no known.json: the fail counts");
    known([{ bench: "fx", id: "G-10", decision: "D-000", reason: "held" }]);
    const r = run(dir, "--only", "G-10");
    assert.equal(r.code, 0, r.out + r.err);
    assert.match(r.out, /^known failure fx G-10: held by D-000, held$/m);
    const rep = JSON.parse(readFileSync(path.join(dir, "out/gold/report.json"), "utf8"));
    const row = rep.benches[0].rows.find((x) => x.id === "G-10");
    assert.equal(row.verdict, "fail");
    assert.equal(row.known, "D-000");
    playwright(dir, "G-10", "passed");
    const now = run(dir, "--only", "G-10");
    assert.equal(now.code, 1);
    assert.match(now.out, /^known failure now passes fx G-10: remove it from tools\/gold\/known\.json \(D-000\)$/m);
    known([{ bench: "fx", id: "G-11", decision: "D-000", reason: "held" }]);
    playwright(dir, "G-10", "failed", "build failed: E_KERNEL");
    assert.equal(run(dir, "--only", "G-10").code, 1, "a known row on another rule holds nothing here");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--calibrate exits 0 on an expected fail and 1 on a recorded pass that now fails", () => {
  const dir = root();
  try {
    playwright(dir, "G-43", "failed", "9 focal pink elements");
    const r = run(dir, "--calibrate");
    assert.equal(r.code, 0, r.out + r.err);
    assert.match(r.out, /^expected fail fx G-43$/m);
    const rep = JSON.parse(readFileSync(path.join(dir, "out/smoke/gold-report.json"), "utf8"));
    const row = rep.benches[0].rows.find((x) => x.id === "G-43");
    assert.equal(row.expect, "fail");
    assert.equal(row.agrees, true);
    playwright(dir, "G-51", "failed", "TypeError");
    const bad = run(dir, "--calibrate");
    assert.equal(bad.code, 1);
    assert.match(bad.out, /^suite defect fx G-51/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("G-55 grades over target between target and fail bound, fail past the bound, pass under target (D-213)", () => {
  const dir = root();
  const p90 = (value, failed) => edit(dir, "out/smoke/runtime.json", () => ({
    fx: [{ measure: "commit to settled p90", value, unit: "ms", target: "2000", failBound: "over 4500", failed, rules: ["G-55"] }],
  }));
  try {
    p90(2203, false);
    const over = run(dir);
    assert.equal(over.code, 1);
    assert.match(over.out, /^over target G-55 runtime: commit to settled p90 2203 ms over target 2000, under fail bound over 4500 \(measured\)$/m);
    assert.match(over.out.split("\n")[0], /over target 1$/);
    p90(4600, true);
    assert.match(run(dir).out, /^fail G-55 runtime: commit to settled p90 4600 ms over its fail bound over 4500 \(measured\)$/m);
    p90(1999, false);
    assert.equal(run(dir).code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a runtime row tagged with no rule is graded into the bench runtime list and exits 1 unless --only narrows", () => {
  const dir = root();
  try {
    edit(dir, "out/smoke/runtime.json", (j) => {
      j.fx.push({ measure: "export 3MF", value: null, unit: "ms", target: "1000", failBound: "over 10000", failed: true, rules: [], note: "no 3mf export" });
      return j;
    });
    const r = run(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /^runtime fail export 3MF null ms over its fail bound over 10000, no 3mf export \(measured\)$/m);
    const rep = JSON.parse(readFileSync(path.join(dir, "out/gold/report.json"), "utf8"));
    assert.equal(rep.benches[0].runtime[0].verdict, "fail");
    assert.equal(run(dir, "--only", "G-03..G-06").code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
