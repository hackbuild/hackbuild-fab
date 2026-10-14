// Corrections and lessons that knowledge/ must carry (fixer pass of 2026-10-11).
// Findings: knowledge/kernels/board-pcb.md and knowledge/designs/spindle.md still taught the SPINDLE R1
// figures D-249 corrects (DRC clean, 35 of 35 non-GND holes isolated, 22 of 22 GND holes bonded), and
// knowledge/03-diagnostics.md had no row for the verification and agent lessons of M06 to M08.
// Run: node --test knowledge/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const knowledge = join(root, "knowledge");
const read = (...p) => readFileSync(join(knowledge, ...p), "utf8");

function mdFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) mdFiles(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

test("D-249 is in the decision log with the corrected SPINDLE counts", () => {
  const decisions = readFileSync(join(root, "docs", "plan", "DECISIONS.md"), "utf8");
  const at = decisions.indexOf("\n### D-249 ");
  assert.ok(at >= 0, "DECISIONS.md has D-249");
  const body = decisions.slice(at, decisions.indexOf("\n### ", at + 1));
  for (const s of ["33 of 35", "18 of 22", "34.15 mm2"]) assert.ok(body.includes(s), `D-249 gives ${s}`);
});

test("a SPINDLE hole count D-249 corrects stands in knowledge only beside D-249", () => {
  // The retired claims: every non-GND hole isolated (35) and every GND hole bonded (22).
  const retired = /\b(?:all 35|35 of 35|35 isolated|35 non-GND|all 22|22 of 22|22 bonded|22 GND holes bonded)\b/;
  const stale = [];
  for (const f of mdFiles(knowledge)) {
    readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      if (retired.test(line) && /isolat|bond/i.test(line) && !line.includes("D-249")) stale.push(`${relative(root, f)}:${i + 1}`);
    });
  }
  assert.deepEqual(stale, [], `old SPINDLE figure without D-249 at:\n${stale.join("\n")}`);
});

test("the board kernel record does not call SPINDLE R1 DRC clean and names the short", () => {
  const pcb = read("kernels", "board-pcb.md");
  const para = pcb.slice(pcb.indexOf("SPINDLE R1"), pcb.indexOf("## KiCad output"));
  assert.ok(!/DRC clean/.test(para), "board-pcb.md no longer says DRC clean for SPINDLE R1");
  for (const s of ["33 of 35", "18 of 22", "D-249", "C-21", "y 20.00"]) assert.ok(para.includes(s), `board-pcb.md SPINDLE paragraph gives ${s}`);
});

test("the SPINDLE power row names the 5V to GND short at the four GND vias", () => {
  const row = read("designs", "spindle.md").split("\n").find((l) => l.startsWith("| power |"));
  assert.ok(row, "spindle.md has a power row");
  for (const s of ["9.80", "16.00", "30.60", "36.20", "D-249"]) assert.ok(row.includes(s), `power row gives ${s}`);
  assert.match(row, /5 ?V to GND short/);
});

test("the diagnostics index carries the verification and agent lessons", () => {
  const diag = read("03-diagnostics.md");
  const at = diag.indexOf("\n## Verification and agents\n");
  assert.ok(at >= 0, "03-diagnostics.md has a Verification and agents section");
  const next = diag.indexOf("\n## ", at + 1);
  const section = diag.slice(at, next < 0 ? undefined : next);
  const rows = section.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*(symptom|-)/.test(l));
  assert.ok(rows.length >= 5, `five lesson rows, read ${rows.length}`);
  const want = [
    ["the legacy DRC hid the SPINDLE short", ["D-249", "CHK-BRD-01", "CHK-BRD-21"]],
    ["check scope", ["CHK-PRT-03 2.0.0", "CHK-PRT-04 2.0.0", "CHK-KEY-01 2.1.0", "CHK-BRD-22", "CHK-BRD-19"]],
    ["a stalled agent", ["114", "m06-report.md"]],
    ["stale dist under a mutant", ["tsc -b", "impl-audit.md", "global-setup.ts"]],
    ["a moved golden", ["D-152", "D-251", "37 of 77"]],
  ];
  for (const [what, needles] of want) {
    assert.ok(rows.some((r) => needles.every((n) => r.includes(n))), `a row for ${what} cites ${needles.join(", ")}`);
  }
  for (const r of rows) assert.equal(r.slice(1, -1).split("|").length, 3, `three cells: ${r.slice(0, 60)}`);
});
