// M01-T06: the resistance budget is a width floor (C-01, D-072). Expected
// values are the card's unrounded numbers (docs/plan/milestones/
// M01-constraints.md M01-T06, "computed, this card": 3.2292, 53.8194,
// 71759.26, 12.9167, 4305.56) and the resistivity figures of the M01-T03
// card table (30 ohm cm vendor, 500 ohm cm inferred), typed here as
// goldens. The committed query goldens under reference/electrical/
// trace-width-budget/expected are read as written by hbf parity, never
// rewritten here.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Bound, CommandResult, ConstraintCtx, Interval, ProfileLookup, ResistivityRow } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { constraintDefs, traceResistanceFloor } from "../src/index";

const DIM = "conductor.width" as const;
const tables = loadProfile();
const FACTS = { pathMm: 62, tMm: 0.72, flexes: true, pitchMm: 8, pitchClrMm: 1 } as const;

const ctxOf = (material: string, facts: ConstraintCtx["facts"], profile: ProfileLookup = createProfileLookup(tables)): ConstraintCtx => ({
  profile, machine: "ffc5p", material, facts,
});
const floorOf = (material: string, budget: number): Bound => {
  const b = traceResistanceFloor.bounds(DIM, ctxOf(material, { ...FACTS, netBudgetOhm: budget }));
  expect(b).toHaveLength(1);
  return b[0]!;
};

/** The card's golden rows: material, budget, unrounded floor and, when E_UNSAT, the budget that fits 6.00 mm. */
const CARD = [
  { golden: 1, material: "cpla-protopasta", budget: 8000, floor: 3.2292, fits: null, tier: "vendor", rho: 30 },
  { golden: 2, material: "cpla", budget: 8000, floor: 53.8194, fits: 71759.26, tier: "inferred", rho: 500 },
  { golden: 3, material: "cpla-protopasta", budget: 2000, floor: 12.9167, fits: 4305.56, tier: "vendor", rho: 30 },
] as const;

describe("circuit/trace-resistance-floor against the M01-T06 card", () => {
  for (const c of CARD) {
    test(`golden ${c.golden}: ${c.material} at ${c.budget} ohm`, () => {
      const b = floorOf(c.material, c.budget);
      expect(b.value).toBeCloseTo(c.floor, 4);
      expect(b).toMatchObject({ side: "lo", kernel: "circuit", source: "CHK-NET-05", qualifier: "computed", basis: c.tier });
      expect(b.reason).toBe(`${c.budget} ohm budget at 62.0 mm path, 0.72 thick, ${c.rho} ohm cm (tier ${c.tier})`);
    });
  }

  test("the floor is rho L / (R t), with rho in ohm mm (ohm cm x 10)", () => {
    // 300 x 62 / (8000 x 0.72), the spec/constraints.ts worked example.
    expect(floorOf("cpla-protopasta", 8000).value).toBeCloseTo((300 * 62) / (8000 * 0.72), 12);
  });

  test("no budget declared, no bound (golden 4)", () => {
    expect(traceResistanceFloor.bounds(DIM, ctxOf("cpla-protopasta", FACTS))).toEqual([]);
  });

  test("another dim, no bound", () => {
    expect(traceResistanceFloor.bounds("conductor.t", ctxOf("cpla-protopasta", { ...FACTS, netBudgetOhm: 8000 }))).toEqual([]);
  });

  for (const c of CARD.filter((x) => x.fits !== null)) {
    test(`golden ${c.golden}: expectedFor names the budget that fits 6.00 mm, rounded up`, () => {
      const ctx = ctxOf(c.material, { ...FACTS, netBudgetOhm: c.budget });
      const e = traceResistanceFloor.expectedFor!(DIM, 6, ctx)!;
      const need = Math.ceil(c.fits!);
      expect(e).toEqual({
        path: "/facts/netBudgetOhm", got: c.budget, nextDim: "conductor.t",
        expected: `at least ${need} ohm at width 6.00, path 62.0, thickness 0.72`,
      });
      // The boundary: that budget fits 6.00 mm and one ohm less does not.
      expect(floorOf(c.material, need).value).toBeLessThanOrEqual(6);
      expect(floorOf(c.material, need - 1).value).toBeGreaterThan(6);
    });
  }

  test("reads the printed along row, and the high end of a range row", () => {
    const seen: string[] = [];
    const base = createProfileLookup(tables);
    const ranged = (row: ResistivityRow): ResistivityRow => ({ ...row, ohmCm: [10, row.ohmCm as number] });
    const spy: ProfileLookup = {
      ...base,
      resistivity: (m, d, f) => {
        seen.push(`${m} ${d} ${f}`);
        return ranged(base.resistivity(m, d, f));
      },
    };
    const b = traceResistanceFloor.bounds(DIM, ctxOf("cpla-protopasta", { ...FACTS, netBudgetOhm: 8000 }, spy));
    expect(seen).toEqual(["cpla-protopasta along printed"]);
    expect(b[0]!.value).toBeCloseTo(3.2292, 4);
  });

  test("the package exports the def for core to collect", () => {
    expect(constraintDefs.map((d) => d.id)).toContain("circuit/trace-resistance-floor");
  });
});

describe("the committed query goldens carry this def's bound as written by hbf parity", () => {
  const ref = new URL("../../../reference/electrical/trace-width-budget/", import.meta.url);
  const decl = JSON.parse(readFileSync(new URL("queries.json", ref), "utf8")) as {
    queries: { golden: string; input: { material: string; facts: ConstraintCtx["facts"] } }[];
  };

  for (const q of decl.queries) {
    test(q.golden, () => {
      const golden = JSON.parse(readFileSync(new URL(q.golden, ref), "utf8")) as CommandResult<Interval>;
      const fromGolden = golden.result!.lo.filter((b) => b.source === "CHK-NET-05");
      const fresh = traceResistanceFloor.bounds(DIM, ctxOf(q.input.material, q.input.facts));
      expect(fromGolden).toEqual(fresh);
    });
  }

  test("golden 2 names the inferred tier on its resistance bound and E_UNSAT at the budget", () => {
    const g = JSON.parse(readFileSync(new URL("expected/query-2.json", ref), "utf8")) as CommandResult<Interval>;
    const r = g.result!.lo.find((b) => b.source === "CHK-NET-05")!;
    expect([r.basis, r.reason.endsWith("(tier inferred)")]).toEqual(["inferred", true]);
    expect(g.result!.legal).toBeNull();
    expect(g.errors.map((e) => [e.code, e.path, e.expected])).toEqual([
      ["E_UNSAT", "/facts/netBudgetOhm", "at least 71760 ohm at width 6.00, path 62.0, thickness 0.72"],
    ]);
  });
});
