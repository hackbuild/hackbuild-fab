// tools/reports/skeleton-findings.md is the input of the M-S-T11 freeze. These
// tests fail when it falls behind the reference it describes: a decision taken
// in M-S on the reference that the file never cites (D-223 left F-07 stale), a
// route the reference runs that neither the freeze row nor a finding names, a
// spec type narrower than the mesh route that reads it with no finding, or a
// number that no longer matches the report golden. Added by the implementation
// audit of 2026-10-06 (plan-drift lens).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { planDoc, planSkip } from "../test-support/plan-root.mjs";

const root = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const FINDINGS = read("tools/reports/skeleton-findings.md");
const DECISIONS = read("docs/plan/DECISIONS.md");
// MILESTONES.md comes from the plan archive (tools/test-support/plan-root.mjs); the test that
// reads it skips as not run on a runner without it.
const SKIP = planSkip();
const MILESTONES = SKIP === false ? planDoc("MILESTONES.md") : "";
const REPORT = JSON.parse(read("reference/keys/flex-pair/expected/report.json"));

/** Findings by id: { id, title, body }. */
const findings = FINDINGS.split(/\n(?=##)/)
  .map((s) => s.match(/^### (F-\d+) ([^\n]+)\n([\s\S]*)$/))
  .filter((m) => m !== null)
  .map((m) => ({ id: m[1], title: m[2], body: m[3] }));
const byId = (id) => {
  const f = findings.find((x) => x.id === id);
  assert.ok(f, `${id} present`);
  return f;
};

/** Decision entries: id, milestone cell, whole text. */
const decisions = DECISIONS.split(/\n### (?=D-\d+ )/).slice(1).map((text) => ({
  id: text.match(/^D-\d+/)[0],
  milestone: (text.match(/^\| Milestone \| ([^\n]*?) \|$/m) ?? [, ""])[1],
  text,
}));
const decisionIds = new Set(decisions.map((d) => d.id));

test("findings are numbered F-01 upward with no gap", () => {
  assert.ok(findings.length >= 15);
  findings.forEach((f, i) => assert.equal(f.id, `F-${String(i + 1).padStart(2, "0")}`, f.title));
});

test("every finding names file, type and what failed, then a change or the deciding entry", () => {
  for (const f of findings) {
    for (const field of ["- File: ", "- Type: ", "- What failed: "]) assert.ok(f.body.includes(field), `${f.id} ${field}`);
    assert.match(f.body, /^- (Change proposed: |Resolved by D-\d+: )/m, `${f.id} change or resolution`);
  }
});

test("every path a File line names exists", () => {
  for (const f of findings) {
    const line = f.body.match(/^- File: ([^\n]+)/m)[1];
    for (const m of line.matchAll(/\b((?:spec|reference|packages|docs|tools|core)\/[\w./-]+\.(?:ts|md|mjs|json))/g)) {
      assert.ok(existsSync(join(root, m[1])), `${f.id} names ${m[1]}`);
    }
  }
});

test("every decision id the file cites exists", () => {
  for (const m of FINDINGS.matchAll(/\bD-\d{3}\b/g)) assert.ok(decisionIds.has(m[0]), `${m[0]} in DECISIONS.md`);
});

test("every M-S decision on the flex-pair reference is cited, so T11 reads one list", () => {
  const onReference = decisions.filter((d) => /^M-S\b/.test(d.milestone) && d.text.includes("reference/keys/flex-pair"));
  assert.ok(onReference.some((d) => d.id === "D-223"));
  for (const d of onReference) assert.match(FINDINGS, new RegExp(`\\b${d.id}\\b`), `${d.id} cited in skeleton-findings.md`);
});

test("a finding a decision resolved no longer proposes work for a later milestone", () => {
  const f07 = byId("F-07");
  assert.match(f07.body, /Resolved by D-223/);
  assert.doesNotMatch(f07.body, /none for M-S/);
  assert.match(f07.body, /reference\/keys\/flex-pair\/build\.ts/);
});

test("every route the reference emits is in the M-S freeze row or a finding", { skip: SKIP }, () => {
  const src = read("reference/keys/flex-pair/build.ts") + read("reference/keys/flex-pair/skeleton-kinds.ts");
  const routes = new Set([...src.matchAll(/route: "(\w+)"/g)].map((m) => m[1]));
  assert.ok(routes.has("revolve"), "D-223 reference runs revolve");
  const row = MILESTONES.match(/^\| build\.ts \| M-S \| ([^|]*) \|/m);
  assert.ok(row, "MILESTONES.md 1.5 build.ts row");
  for (const r of routes) {
    const frozen = new RegExp(`ShapeDecl \\([^)]*\\b${r}\\b`).test(row[1]);
    const named = findings.some((f) => /ShapeDecl/.test(f.body) && new RegExp(`\\b${r}\\b`).test(f.body));
    assert.ok(frozen || named, `route ${r}: in the 1.5 freeze row or a ShapeDecl finding`);
  }
});

test("a per-row revolve field in mesh while spec has one field per shape has a finding", () => {
  const mesh = read("packages/mesh/src/routes/revolve.ts");
  const spec = read("spec/build.ts");
  const revolveDecl = spec.slice(spec.indexOf('route: "revolve"'), spec.indexOf('route: "lathe"'));
  const perRowInMesh = /interface RevolveRow \{[^}]*\bf: RadialField/.test(mesh);
  const oneFieldInSpec = /readonly field\?: \{ readonly id: string/.test(revolveDecl);
  if (perRowInMesh && oneFieldInSpec) {
    const f = findings.find((x) => /ShapeDecl revolve field per row/.test(x.title));
    assert.ok(f, "a finding records the revolve field gap");
    assert.match(f.body, /spec\/build\.ts/);
    assert.match(f.body, /448 of 448/);
  }
});

test("numbers the findings quote equal the report golden", () => {
  const find = (id) => REPORT.findings.find((x) => x.id === id);
  const net02 = find("CHK-NET-02").measured.toFixed(4);
  assert.match(byId("F-06").body, new RegExp(`\\b${net02.replace(".", "\\.")} mm`), `F-06 quotes CHK-NET-02 ${net02}`);
  const net29 = (find("CHK-NET-29").measured / 1000).toFixed(2);
  assert.match(byId("F-05").body, new RegExp(`\\b${net29.replace(".", "\\.")} kohm`), `F-05 quotes CHK-NET-29 ${net29}`);
});
