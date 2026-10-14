// circuit/trace-resistance-floor (M01-T06, C-01, D-072): R = rho L / (w t),
// so a maximum-resistance budget is a width floor, w >= rho L / (R t).
// Present only when the query declares netBudgetOhm. The section math is
// profile sectionResistance, the one home of R = rho L / A: the resistance
// of a 1 mm wide section over the budget is the floor in mm, and the
// resistance at the ceiling width is the budget that fits it. The row is
// the printed along row; a range row reads its high end, the worst case.
// With no netBudgetOhm and an mcu declared, the budget is the largest path
// that reads LOW on that MCU's pullup (CHK-NET-05 chain, M01-T08 step 5).

import { qualify, type Bound, type ConstraintCtx, type ConstraintDef, type ResistivityRow } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { pullupPathBudget, whole } from "./pullup-low-read.js";

const DIM = "conductor.width" as const;

const num = (ctx: ConstraintCtx, k: string): number => ctx.facts[k] as number;

const ohmCm = (row: ResistivityRow): number => (typeof row.ohmCm === "number" ? row.ohmCm : row.ohmCm[1]);

/** Section resistance, ohm, at width w mm: the high end when the row is a range. */
function ohmAt(row: ResistivityRow, pathMm: number, w: number, tMm: number): number {
  const r = sectionResistance(row, pathMm, w * tMm).ohm;
  return typeof r === "number" ? r : r[1];
}

const rowOf = (ctx: ConstraintCtx): ResistivityRow => ctx.profile.resistivity(ctx.material, "along", "printed");

export const traceResistanceFloor: ConstraintDef = {
  id: "circuit/trace-resistance-floor",
  version: "1.0.0",
  dims: [DIM],
  kernels: ["circuit", "profile"],
  units: { [DIM]: "mm" },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== DIM) return [];
    const declared = ctx.facts["netBudgetOhm"] !== undefined;
    const chain = declared ? undefined : pullupPathBudget(ctx);
    if (!declared && chain === undefined) return [];
    const row = rowOf(ctx);
    const L = num(ctx, "pathMm");
    const t = num(ctx, "tMm");
    const R = chain?.ohm ?? num(ctx, "netBudgetOhm");
    const tier = row.provenance.tier;
    const via = chain === undefined ? "" : `, ${chain.reason}`;
    const tiers = chain === undefined || chain.tier === null ? [tier] : [tier, chain.tier];
    return [{
      value: ohmAt(row, L, 1, t) / R,
      side: "lo",
      kernel: "circuit",
      reason: `${R.toFixed(0)} ohm budget at ${L.toFixed(1)} mm path, ${t.toFixed(2)} thick, ${ohmCm(row).toFixed(0)} ohm cm (tier ${tier})${via}`,
      source: "CHK-NET-05",
      ...qualify(tiers),
    }];
  },
  /** The budget whose floor meets the ceiling, rounded up to the ohm so it fits. */
  expectedFor(_dim, ceiling, ctx) {
    const row = rowOf(ctx);
    const L = num(ctx, "pathMm");
    const t = num(ctx, "tMm");
    const need = whole(ohmAt(row, L, ceiling, t), "up");
    return {
      path: "/facts/netBudgetOhm",
      got: ctx.facts["netBudgetOhm"],
      expected: `at least ${need.toFixed(0)} ohm at width ${ceiling.toFixed(2)}, path ${L.toFixed(1)}, thickness ${t.toFixed(2)}`,
      nextDim: "conductor.t",
    };
  },
};
