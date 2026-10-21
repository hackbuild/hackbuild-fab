// M01-T10 interval fixtures, moved with their defs to packages/mechanisms
// at M06-T02 (cascade-slop) and M06-T03 (hook-rule), unchanged. The test
// lives in core because it drives the constraints solver, which the
// mechanisms package, its tier-1 sibling, may not import. Every
// expected number is read from a source the code under test never wrote: the golden tables of the M01-T10 card
// (docs/plan/milestones/M01-constraints.md), the canonical originals the
// lineage rows name (tumbler.html, params.scad), and the closed form run
// of hook_fit.py recorded in test/legacy/hook-rule.py.stdout.txt.

import { existsSync, readFileSync } from "node:fs";
import { sourcePath } from "../../tools/test-support/originals-root.js";
import { describe, expect, test } from "vitest";
import { planCard } from "../../tools/test-support/plan-root.js";
import { isThrownCommandError, type ConstraintCtx } from "@hackbuild/spec";
type Facts = ConstraintCtx["facts"];
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { createRegistry, nearest, solve, verdictOf } from "@hackbuild/constraints";
import {
  CASCADE_DEPTH, CASCADE_SEVERITY, CASCADE_WARN_TEXT, HOOK_CONSTANTS, HOOK_D, HOOK_RB, HOOK_SWEEP, cascadeReadout, constraintDefs, hookRule,
} from "@hackbuild/mechanisms";

const repo = new URL("../../", import.meta.url);
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

describe("mech/hook-rule (COTTER GEO.hookRule)", () => {
  const legacy = read("packages/mechanisms/test/legacy/hook-rule.py.stdout.txt").trim().split("\n")
    .map((l) => JSON.parse(l) as { hole: number; tb: number; d: number; Rb: number; h: number; sweep: number; ext: number });
  const table = cardTable("hole mm").map((c) => c.map(Number) as [number, number, number, number, number, number]);

  test("the legacy run and the card table hold the same 7 pairs as hook_fit.py verify_all", () => {
    expect(legacy.map((p) => [p.hole, p.tb])).toEqual(table.map((r) => [r[0], r[1]]));
    expect(legacy).toHaveLength(7);
  });

  test("the profile defaults are geo.js defaults and design_full keywords", () => {
    const c = (k: keyof typeof HOOK_CONSTANTS): number => profile.constant(HOOK_CONSTANTS[k]).value;
    const geo = "fit = fit == null ? 0.95 : fit; margin = margin == null ? 0.35 : margin; rise = rise == null ? 5.5 : rise; ext = ext == null ? 2 : ext;";
    expect(geo).toBe(`fit = fit == null ? ${c("fit")} : fit; margin = margin == null ? ${c("margin")} : margin; rise = rise == null ? ${c("rise")} : rise; ext = ext == null ? ${c("ext")} : ext;`);
    const src = sourceOf("cotter.geo/r5");
    if (existsSync(src)) {
      const js = readFileSync(src, "utf8");
      expect(js).toContain(geo);
      expect(js).toContain(`let Rb = d / 2 + ${c("bendStart")};`);
      expect(js).toContain(`Rb += ${c("bendStep")}; }`);
      expect(js).toContain(`let s = ${c("sweepMin")}; while (s < ${c("sweepMax")})`);
    }
  });

  for (const [i, p] of legacy.entries()) {
    const row = table[i]!;
    test(`hole ${p.hole} board ${p.tb}: d ${p.d}, Rb floor ${p.Rb}, sweep floor ${p.sweep}`, () => {
      const ctx = ctxOf({ hole: p.hole, tb: p.tb });
      const s = hookRule(ctx);
      expect([s.d, s.Rb, s.sweep]).toEqual([p.d, p.Rb, p.sweep]);
      expect(s.h).toBeCloseTo(p.h, 12);
      expect([s.d, s.Rb, Number(s.h.toFixed(4)), s.sweep]).toEqual([row[2], row[3], row[4], row[5]]);

      const d = solve(reg, HOOK_D, ctx).interval;
      expect(d.legal).toEqual([p.d, p.d]);
      const rb = solve(reg, HOOK_RB, ctx).interval;
      expect(rb.legal).toEqual([p.Rb, null]);
      expect(rb.lo[0]).toMatchObject({ kernel: "mesh", qualifier: "computed", basis: "inferred" });
      const sw = solve(reg, HOOK_SWEEP, ctx);
      expect(sw.interval.legal).toEqual([p.sweep, profile.constant(HOOK_CONSTANTS.sweepMax).value]);
      expect(sw.interval.binding).toEqual({ lo: [0], hi: [0] });
      expect(sw.interval.hi[0]).toMatchObject({ qualifier: "inferred", basis: "inferred" });
      expect(sw.unsat).toBeNull();
    });
  }

  test("a rise no sweep up to 88 deg reaches is E_UNSAT naming the rise that fits", () => {
    const r = solve(reg, HOOK_SWEEP, ctxOf({ hole: 6.35, tb: 3.2, rise: 20 }));
    expect(r.interval.legal).toBeNull();
    expect(r.interval.lo[0]!.value).toBe(89);
    expect(r.unsat).toMatchObject({ code: "E_UNSAT", path: "/facts/rise", got: 20, record: "mech/hook-rule" });
    const fits = Number(/at most ([\d.]+) mm/.exec(r.unsat!.expected ?? "")?.[1]);
    const at = (rise: number): number => hookRule(ctxOf({ hole: 6.35, tb: 3.2, rise })).sweep;
    expect(at(fits)).toBe(88);
    expect(at(fits + 0.01)).toBe(89);
  });

  test("the port equals the canonical GEO.hookRule run in place over a grid of holes and boards", (t) => {
    const src = sourceOf("cotter.geo/r5");
    if (!existsSync(src)) {
      t.skip(`not on this machine: ${src}`);
      return;
    }
    // The function text is cut from geo.js and run as written; no number in it is retyped here.
    const js = readFileSync(src, "utf8");
    const from = js.indexOf("GEO.hookRule = function");
    const end = "gap: 0.6 }; };";
    const to = js.indexOf(end, from);
    expect([from, to].every((i) => i >= 0)).toBe(true);
    const GEO: { hookRule?: (hole: number, tb: number) => { d: number; Rb: number; sweep: number } } = {};
    new Function("GEO", js.slice(from, to + end.length))(GEO);
    const sweepMax = profile.constant(HOOK_CONSTANTS.sweepMax).value;
    let pairs = 0;
    let ulp = 0;
    let unsat = 0;
    for (let hc = 150; hc <= 1200; hc += 1) {
      for (const tb of [0.8, 1.6, 3.2, 4.8, 6.35, 9.5, 12.7]) {
        const hole = hc / 100;
        const want = GEO.hookRule!(hole, tb);
        const got = hookRule(ctxOf({ hole, tb }));
        pairs += 1;
        expect(got.d, `d at ${hole}, ${tb}`).toBe(want.d);
        // Rb = start + k step lands on the nearest double; repeated addition can sit one ulp off it.
        if (got.Rb !== want.Rb) ulp += 1;
        expect(Math.abs(got.Rb - want.Rb), `Rb at ${hole}, ${tb}`).toBeLessThanOrEqual(4 * Number.EPSILON * want.Rb);
        if (got.sweep > sweepMax) {
          unsat += 1;
          expect(want.sweep, `the source returns its loop limit unchecked at ${hole}, ${tb}`).toBe(sweepMax);
        } else {
          expect(got.sweep, `sweep at ${hole}, ${tb}`).toBe(want.sweep);
        }
      }
    }
    // hole 6, tb 3, fit 1, margin 0.5: Rb 5 gives h exactly hole less margin, on the search grid,
    // so the first Rb that passes sits on the closed form itself and the search must not start past it.
    const edge = { hole: 6, tb: 3, fit: 1, margin: 0.5 };
    const src5 = (GEO.hookRule as unknown as (...a: number[]) => { Rb: number })(edge.hole, edge.tb, edge.fit, edge.margin);
    expect(hookRule(ctxOf(edge)).Rb).toBe(src5.Rb);
    expect(src5.Rb).toBe(5);
    expect(pairs).toBe(1051 * 7);
    // Recorded on the card: the ulp count, and that no grid point reads a different sweep.
    expect(ulp).toBeGreaterThan(0);
    expect(unsat).toBeGreaterThan(0);
  });

  test("facts override the profile defaults; fit at or under margin and a missing hole are refused", () => {
    expect(hookRule(ctxOf({ hole: 6.35, tb: 6.35, fit: 1.05 })).d).toBe(5.3);
    // round(6.356 - 0.95, 2) is 5.41: the rod rounds to the nearest hundredth, never down.
    expect(hookRule(ctxOf({ hole: 6.356, tb: 6.35 })).d).toBe(5.41);
    expect(thrown(() => hookRule(ctxOf({ hole: 6.35, tb: 6.35, fit: 0.3 })))).toMatchObject({ code: "E_SCHEMA", path: "/facts/fit" });
    expect(thrown(() => solve(reg, HOOK_RB, ctxOf({ tb: 6.35 })))).toMatchObject({ code: "E_PARAM_MISSING", path: "/facts/hole" });
  });
});
