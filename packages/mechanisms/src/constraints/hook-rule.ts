// mech/hook-rule (M01-T10 step 3, plan-deltas R56): the COTTER peg hook
// closed form, ported from GEO.hookRule in the canonical
// cotter-src/src/geo.js line 102 (lineage cotter.geo/r5), which equals
// design_full in cotter-src/tools/hook_fit.py lines 93 to 100. From the
// hole and board thickness tb (facts hole, tb, mm) it gives three dims:
//   hook.d      the rod, round(hole - fit, 2), as floor and ceiling
//   hook.Rb     smallest bend radius d/2 + start + k step (k whole) whose
//               inner radius Rb - d/2 passes tb/2 and whose bend clearance
//               h = (Rb + d/2) - sqrt((Rb - d/2)^2 - (tb/2)^2) is at most
//               hole - margin
//   hook.sweep  smallest whole degree from sweepMin with
//               Rb (1 - cos a) + ext sin a + d/2 - hole/2 at least rise,
//               ceiling sweepMax (the source's loop limit). The source
//               stops below sweepMax and returns it unchecked; this port
//               also tests sweepMax and, when no whole degree up to it
//               reaches the rise, gives a floor one step over: E_UNSAT
// fit, margin, rise and ext are facts when given, else the hook.* profile
// constants; the search start and steps are hook.* constants too. The
// insertion proof (hook_fit.py verify_all) is an M02 card.
//
// The source steps Rb by repeated addition. This port takes Rb = start +
// k step with k from the closed-form inner radius h meets, then tests the
// source's condition step by step, so a tight hole cannot loop forever;
// the 7 verify_all pairs equal the source's floats (test/legacy).

import { commandError, qualify, qualifyRow, type Bound, type Constant, type ConstraintCtx, type ConstraintDef, type ConstraintDim, type UnsatExpectation } from "@hackbuild/spec";
import { factOrConstant, needFact, tiersOf, type Overridable } from "@hackbuild/spec";

export const HOOK_RULE_ID = "mech/hook-rule";

export const HOOK_D: ConstraintDim = "hook.d";
export const HOOK_RB: ConstraintDim = "hook.Rb";
export const HOOK_SWEEP: ConstraintDim = "hook.sweep";

/** hook.d lies on the hundredth of a mm, as round(x, 2) leaves it. */
const D_PER_MM = 100;

/** E_UNSAT prints the rise that fits at two decimals. */
const PRINT_PER_MM = 100;

/** hook.sweep is a whole degree. */
const SWEEP_STEP = 1;

/** The profile constants the rule reads, by role. */
export const HOOK_CONSTANTS = {
  fit: "hook.fit",
  margin: "hook.margin",
  rise: "hook.rise",
  ext: "hook.ext",
  bendStart: "hook.bendStartOverRadius",
  bendStep: "hook.bendStep",
  sweepMin: "hook.sweepMin",
  sweepMax: "hook.sweepMax",
} as const;

/** An input read straight from its constant row; facts never override it. */
type FromRow = Overridable & { readonly row: Constant };

/** Every input of one solve, with the rows it read. */
interface Inputs {
  readonly hole: number;
  readonly tb: number;
  readonly fit: Overridable;
  readonly margin: Overridable;
  readonly rise: Overridable;
  readonly ext: Overridable;
  readonly bendStart: FromRow;
  readonly bendStep: FromRow;
  readonly sweepMin: FromRow;
  readonly sweepMax: FromRow;
}

function inputs(ctx: ConstraintCtx): Inputs {
  const over = (key: "fit" | "margin" | "rise" | "ext"): Overridable => factOrConstant(ctx, key, HOOK_CONSTANTS[key], HOOK_RULE_ID);
  const fixed = (key: "bendStart" | "bendStep" | "sweepMin" | "sweepMax"): FromRow => {
    const row = ctx.profile.constant(HOOK_CONSTANTS[key]);
    return { value: row.value, row };
  };
  return {
    hole: needFact(ctx, "hole", HOOK_RULE_ID),
    tb: needFact(ctx, "tb", HOOK_RULE_ID),
    fit: over("fit"), margin: over("margin"), rise: over("rise"), ext: over("ext"),
    bendStart: fixed("bendStart"), bendStep: fixed("bendStep"), sweepMin: fixed("sweepMin"), sweepMax: fixed("sweepMax"),
  };
}

/** The closed form at one hole and board. */
export interface HookSolution {
  /** Rod diameter, mm. */
  readonly d: number;
  /** Smallest bend radius on the search grid, mm. */
  readonly Rb: number;
  /** Bend clearance h at that Rb, mm. */
  readonly h: number;
  /** Smallest whole sweep that reaches the rise, deg; sweepMax + 1 step when none up to sweepMax does. */
  readonly sweep: number;
  /** Lock height above the hole at sweepMax, mm: the largest rise any sweep under the ceiling gives. */
  readonly riseAtMax: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Bend clearance at Rb, or null while the inner radius has not passed tb/2. */
function clearance(Rb: number, d: number, tb: number): number | null {
  const outer = Rb + d / 2;
  const inner = Rb - d / 2;
  if (!(inner > tb / 2)) return null;
  return outer - Math.sqrt(inner * inner - (tb * tb) / 4);
}

const lockHeight = (Rb: number, d: number, hole: number, ext: number, deg: number): number =>
  Rb * (1 - Math.cos(rad(deg))) + ext * Math.sin(rad(deg)) + d / 2 - hole / 2;

function solveHook(x: Inputs): HookSolution {
  const { hole, tb } = x;
  const d = Math.round((hole - x.fit.value) * D_PER_MM) / D_PER_MM;
  const gap = hole - x.margin.value - d;
  // h falls toward d as Rb grows, so no Rb meets hole - margin unless d sits under it.
  if (!(gap > 0)) {
    throw commandError({
      code: "E_SCHEMA", path: "/facts/fit", got: String(x.fit.value),
      expected: `a fit above margin ${String(x.margin.value)} mm, so the rod is under hole less margin`,
      hint: "no bend radius clears the bore when the rod is as wide as hole less margin; raise fit or lower margin",
      record: HOOK_RULE_ID,
    });
  }
  const start = d / 2 + x.bendStart.value;
  const step = x.bendStep.value;
  // Closed form of h = hole - margin: inner = (gap^2 + (tb/2)^2) / (2 gap). Start two steps under it.
  const innerAt = (gap * gap + (tb * tb) / 4) / (2 * gap);
  let k = Math.max(0, Math.floor((innerAt + d / 2 - start) / step) - 2);
  for (;;) {
    const Rb = start + k * step;
    const h = clearance(Rb, d, tb);
    if (h !== null && h <= hole - x.margin.value) {
      const lo = x.sweepMin.value;
      const hi = x.sweepMax.value;
      let sweep = lo;
      while (sweep <= hi && lockHeight(Rb, d, hole, x.ext.value, sweep) < x.rise.value) sweep += SWEEP_STEP;
      return { d, Rb, h, sweep, riseAtMax: lockHeight(Rb, d, hole, x.ext.value, hi) };
    }
    k += 1;
  }
}

/** The closed form for the facts in ctx; tests and readouts call it, the def reports it. */
export function hookRule(ctx: ConstraintCtx): HookSolution {
  return solveHook(inputs(ctx));
}

const mm = (v: number): string => v.toFixed(2);

export const hookRuleDef: ConstraintDef = {
  id: HOOK_RULE_ID,
  version: "1.0.0",
  dims: [HOOK_D, HOOK_RB, HOOK_SWEEP],
  kernels: ["mesh"],
  units: { [HOOK_D]: "mm", [HOOK_RB]: "mm", [HOOK_SWEEP]: "deg" },
  steps: { [HOOK_D]: 1 / D_PER_MM, [HOOK_SWEEP]: SWEEP_STEP },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== HOOK_D && dim !== HOOK_RB && dim !== HOOK_SWEEP) return [];
    const x = inputs(ctx);
    const s = solveHook(x);
    const base = { kernel: "mesh" as const, source: HOOK_RULE_ID };
    if (dim === HOOK_D) {
      const q = qualify(tiersOf([x.fit]));
      const reason = `rod diameter: hole ${mm(x.hole)} less fit ${mm(x.fit.value)}, rounded to the hundredth mm`;
      return [{ ...base, value: s.d, side: "lo", reason, ...q }, { ...base, value: s.d, side: "hi", reason, ...q }];
    }
    if (dim === HOOK_RB) {
      return [{
        ...base, value: s.Rb, side: "lo",
        reason: `smallest bend radius from d/2 plus ${mm(x.bendStart.value)} in ${mm(x.bendStep.value)} mm steps whose arc clears a ${mm(x.tb)} mm board within hole ${mm(x.hole)} less margin ${mm(x.margin.value)}`,
        ...qualify(tiersOf([x.fit, x.margin, x.bendStart, x.bendStep])),
      }];
    }
    const lo = x.sweepMin.value;
    const hi = x.sweepMax.value;
    const reached = s.sweep <= hi;
    return [
      {
        ...base, value: s.sweep, side: "lo",
        reason: reached
          ? `smallest whole sweep from ${lo.toFixed(0)} deg that locks ${mm(x.rise.value)} mm above the hole, with the hook.Rb floor and a ${mm(x.ext.value)} mm tail`
          : `no whole sweep from ${lo.toFixed(0)} to ${hi.toFixed(0)} deg locks ${mm(x.rise.value)} mm above the hole`,
        ...qualify(tiersOf([x.fit, x.margin, x.rise, x.ext, x.bendStart, x.bendStep, x.sweepMin])),
      },
      {
        ...base, value: hi, side: "hi",
        reason: `the sweep search stops at ${hi.toFixed(0)} deg (COTTER geo.js loop limit)`,
        ...qualifyRow(x.sweepMax.row.provenance.tier),
      },
    ];
  },
  expectedFor(dim, ceiling, ctx): UnsatExpectation | null {
    if (dim !== HOOK_SWEEP) return null;
    const x = inputs(ctx);
    const s = solveHook(x);
    // The largest rise a sweep at the ceiling locks, rounded down at the printed two decimals so the printed value still fits.
    const fits = Math.floor(s.riseAtMax * PRINT_PER_MM) / PRINT_PER_MM;
    return {
      path: "/facts/rise", got: x.rise.value,
      expected: `a rise at most ${fits.toFixed(2)} mm, what a ${ceiling.toFixed(0)} deg sweep locks at this hole and board`,
    };
  },
};
