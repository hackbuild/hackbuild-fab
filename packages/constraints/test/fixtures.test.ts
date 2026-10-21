// M01-T10 interval fixtures. Every expected number is read from a source
// the code under test never wrote: the golden tables of the M01-T10 card
// (docs/plan/milestones/M01-constraints.md), the canonical originals the
// lineage rows name (tumbler.html, params.scad), and the closed form run
// of hook_fit.py recorded in test/legacy/hook-rule.py.stdout.txt.

import { existsSync, readFileSync } from "node:fs";
import { sourcePath } from "../../../tools/test-support/originals-root.js";
import { describe, expect, test } from "vitest";
import { planCard } from "../../../tools/test-support/plan-root.js";
import { isThrownCommandError, type ConstraintCtx } from "@hackbuild/spec";
type Facts = ConstraintCtx["facts"];
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { LATCH_SERVO_X, OGEE16_LATCH_SEVERITY, constraintDefs, createRegistry, nearest, solve, verdictOf } from "../src/index";

const repo = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, repo), "utf8");
const lineage = JSON.parse(read("lineage.json")) as { id: string; source: string; sha256: string }[];
const sourceOf = (id: string): string => { const s = lineage.find((r) => r.id === id)?.source; return s === undefined ? "" : sourcePath(s); };

const profile = createProfileLookup(loadProfile());
const reg = createRegistry(constraintDefs);
const ctxOf = (facts: Facts): ConstraintCtx => ({ profile, machine: "ffc5p", material: "", facts });

/** The M01-T10 section of the card. */
const card = ((): string => {
  const md = planCard("M01-constraints.md");
  const at = md.indexOf("## M01-T10 ");
  return md.slice(at, md.indexOf("\n## ", at + 1));
})();

/** Rows of the first card table whose header starts with head, as cells. */
function cardTable(head: string): string[][] {
  const lines = card.split("\n");
  const at = lines.findIndex((l) => l.startsWith(`| ${head}`));
  expect(at, `card has no table headed ${head}`).toBeGreaterThanOrEqual(0);
  const rows: string[][] = [];
  for (const l of lines.slice(at + 2)) {
    if (!l.startsWith("|")) break;
    rows.push(l.slice(1, -1).split("|").map((c) => c.trim()));
  }
  return rows;
}

function thrown(f: () => unknown): { code: string; path?: string } {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a command error");
}

describe("mech/ogee16-latch-servo-window (OGEE16 LSV_X)", () => {
  const golden = /latchServo\.x legal (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?), measured (\d+(?:\.\d+)?), pass;\s+LSV_X (\d+(?:\.\d+)?) gives fail with nearest (\d+(?:\.\d+)?)/.exec(card.replace(/\n/g, " "));

  test("the window equals the card golden and LSV_X 124 passes", () => {
    expect(golden).not.toBeNull();
    const [lo, hi, shipped, bad, near] = golden!.slice(1).map(Number) as [number, number, number, number, number];
    const r = solve(reg, LATCH_SERVO_X, ctxOf({}));
    expect(r.interval.legal).toEqual([lo, hi]);
    expect(r.interval.binding).toEqual({ lo: [0], hi: [0] });
    expect(r.interval.lo[0]).toMatchObject({ kernel: "mesh", qualifier: "inferred", basis: "inferred" });
    expect(r.interval.lo[0]!.reason).toContain("the last column servo, which ends at x 104.4");
    expect(r.interval.hi[0]!.reason).toContain("+X rail at x 136");
    expect(verdictOf(r.interval, shipped, OGEE16_LATCH_SEVERITY)).toBe("pass");
    expect(verdictOf(r.interval, bad, OGEE16_LATCH_SEVERITY)).toBe("fail");
    expect(nearest(r.interval, bad)).toBe(near);
  });

  test("the constants equal what the canonical params.scad states", (t) => {
    const src = sourceOf("ogee16.params/r16p");
    if (!existsSync(src)) {
      t.skip(`not on this machine: ${src}`);
      return;
    }
    const scad = readFileSync(src, "utf8").replace(/\s*\/\/\s*/g, " ");
    const c = (id: string): number => profile.constant(id).value;
    expect(scad).toContain(`(which ends at x ${c("ogee16.colServo3EndX")}) so LSV_X > ${c("ogee16.latchServoX.lo")}`);
    expect(scad).toContain(`clear the +X rail at ${c("ogee16.railX1")} so LSV_X < ${c("ogee16.latchServoX.hi")}.`);
    expect(scad).toContain(`RAIL_X1 = ${c("ogee16.railX1")};`);
    expect(scad).toContain("LSV_X = 124;");
  });
});

