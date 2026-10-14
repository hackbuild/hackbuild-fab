// Stand-in ConstraintDefs for the constraints.query tests. Dims are
// fixture.*, never registered by core; the real defs land with M01-T06 to
// T10. Every bound reads a fact or a profile row, and every number in a
// reason goes through core/src/text/fmt.ts.

import { qualify, qualifyRow, type Bound, type ConstraintDef, type ConstraintCtx } from "@hackbuild/spec";
import { createRegistry, type ConstraintRegistry } from "@hackbuild/constraints";
import { fmtIn } from "../../src/text/fmt.js";

export const W = "fixture.width" as const;
export const LEN = "fixture.len" as const;

/** The profile constant the row floor reads. */
export const FLOOR_CONSTANT = "fingertip.mm.lo";

const num = (ctx: ConstraintCtx, k: string): number => ctx.facts[k] as number;

/** The resistivity row the budget floor reads, ohm cm. */
function rho(ctx: ConstraintCtx): { readonly value: number; readonly tier: Bound["basis"] & string } {
  const row = ctx.profile.resistivity(ctx.material, "along", "printed");
  const v = typeof row.ohmCm === "number" ? row.ohmCm : row.ohmCm[1];
  return { value: v, tier: row.provenance.tier };
}

/** A floor read straight from a profile constant row. */
export const rowFloor: ConstraintDef = {
  id: "fixture/row-floor", version: "1.0.0", dims: [W], kernels: ["profile"], units: { [W]: "mm" },
  bounds(_d, ctx): Bound[] {
    const c = ctx.profile.constant(FLOOR_CONSTANT);
    return [{ value: c.value, side: "lo", kernel: "profile", reason: `fingertip floor ${fmtIn("mm", c.value)} mm`, ...qualifyRow(c.provenance.tier) }];
  },
};

/** w >= rho L / R, present only with budgetOhm declared; expectedFor inverts it for the budget. */
export const budgetFloor: ConstraintDef = {
  id: "fixture/budget-floor", version: "1.0.0", dims: [W], kernels: ["circuit", "profile"], units: { [W]: "mm" },
  bounds(_d, ctx): Bound[] {
    if (ctx.facts["budgetOhm"] === undefined) return [];
    const r = rho(ctx);
    const L = num(ctx, "lenMm");
    const R = num(ctx, "budgetOhm");
    return [{
      value: (r.value * L) / R, side: "lo", kernel: "circuit", source: "CHK-NET-05",
      reason: `${fmtIn("ohm", R)} ohm budget at ${fmtIn("mm", L)} mm, ${fmtIn("ohm cm", r.value)} ohm cm (${r.tier})`,
      ...qualify([r.tier]),
    }];
  },
  expectedFor(_d, ceiling, ctx) {
    const r = rho(ctx);
    const L = num(ctx, "lenMm");
    return {
      path: "/facts/budgetOhm", got: ctx.facts["budgetOhm"],
      expected: `at least ${fmtIn("ohm", (r.value * L) / ceiling, "up")} ohm at width ${fmtIn("mm", ceiling, "down")}, length ${fmtIn("mm", L)}`,
      nextDim: LEN,
    };
  },
};

/** A ceiling read from a fact. */
export const capCeiling: ConstraintDef = {
  id: "fixture/cap", version: "1.0.0", dims: [W], kernels: ["mesh"], units: { [W]: "mm" },
  bounds: (_d, ctx): Bound[] => [{ value: num(ctx, "capMm"), side: "hi", kernel: "mesh", reason: `cap ${fmtIn("mm", num(ctx, "capMm"))} mm`, ...qualify([]) }],
};

/** The dim the budget floor's E_UNSAT points next at: a length ceiling from the same facts. */
export const lenCeiling: ConstraintDef = {
  id: "fixture/len-ceiling", version: "1.0.0", dims: [LEN], kernels: ["circuit", "profile"], units: { [LEN]: "mm" },
  bounds(_d, ctx): Bound[] {
    const r = rho(ctx);
    const v = (num(ctx, "budgetOhm") * num(ctx, "capMm")) / r.value;
    return [{ value: v, side: "hi", kernel: "circuit", reason: `${fmtIn("ohm", num(ctx, "budgetOhm"))} ohm budget at width ${fmtIn("mm", num(ctx, "capMm"))}`, ...qualify([r.tier]) }];
  },
};

/** Every fixture def; `withNext: false` leaves the next dim unregistered. */
export function fixtureRegistry(opts: { readonly withNext?: boolean } = {}): ConstraintRegistry {
  return createRegistry([rowFloor, budgetFloor, capCeiling, ...(opts.withNext === false ? [] : [lenCeiling])]);
}
