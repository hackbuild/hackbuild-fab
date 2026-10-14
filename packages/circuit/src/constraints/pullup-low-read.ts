// CHK-NET-05 as an interval on the pullup (C-02, D-076, CHECKS.md 7.5).
// A pressed key pulls the pin to ground through the printed path R, so the
// pin sits at VDD R / (R + Rpu) and reads LOW when that is at most VIL.
// Solved for the pullup that is a floor, Rpu >= R (VDD - VIL) / VIL; solved
// for the path it is the budget the trace width reads (D-072 chain). Every
// voltage and pullup comes from the catalog pin row of facts.mcu
// (packages/catalog/data/mcu-pins.json, M05-T02). The BOSS 0.5 VIO threshold
// and the blocks.html 0.3 to 0.7 VIO hint live on the catalog boss-legacy
// row, which mcuPinRow refuses with E_REF, so a verdict here never reads
// them (D-076, D-077).

import {
  commandError, qualify, qualifyRow, type Bound, type ConstraintCtx, type ConstraintDef, type ConstraintDim, type Interval, type Tier,
} from "@hackbuild/spec";
import { mcuPinRow, type McuPinRow } from "@hackbuild/catalog";
import { pullupEnds } from "../read/pullup.js";

export const PULLUP_DIM: ConstraintDim = "port.pullup";

/** The dim whose resistance floor the pullup budget feeds (M01-T06). */
export const PULLUP_NEXT_DIM: ConstraintDim = "conductor.width";

/** Relative tolerance under which a computed ohm value counts as whole, so 15000.000000000002 prints 15000. */
const WHOLE_EPS = 1e-9;

/**
 * A computed ohm value to a whole ohm: the nearest one when within WHOLE_EPS
 * relative of it, so binary rounding never adds or drops an ohm, otherwise
 * up (a floor or a needed budget) or down (a maximum). The one whole-ohm
 * rounding for circuit constraints.
 */
export const whole = (v: number, dir: "up" | "down"): number => {
  const r = Math.round(v);
  if (Math.abs(v - r) <= WHOLE_EPS * Math.max(1, Math.abs(v))) return r;
  return dir === "up" ? Math.ceil(v) : Math.floor(v);
};

/** A voltage at two decimals, or three when the row states three (0.825): how a pin row's thresholds print. */
export const voltsText = (v: number): string => v.toFixed(3).replace(/0$/, "");
const volts = voltsText;

/** Smallest pullup that reads LOW with a pressed path of pathOhm: R (VDD - VIL) / VIL. */
export function minPullupOhm(row: Pick<McuPinRow, "vddV" | "vilMaxV">, pathOhm: number): number {
  return (pathOhm * (row.vddV - row.vilMaxV)) / row.vilMaxV;
}

/** Largest pressed path that reads LOW at pullupOhm: Rpu VIL / (VDD - VIL). */
export function maxPathOhm(row: Pick<McuPinRow, "vddV" | "vilMaxV">, pullupOhm: number): number {
  return (pullupOhm * row.vilMaxV) / (row.vddV - row.vilMaxV);
}

/** The pin row facts.mcu names. E_PARAM_MISSING when absent, E_REF when no catalog row has it. */
export function mcuRowOf(ctx: ConstraintCtx): McuPinRow {
  const id = ctx.facts["mcu"];
  if (typeof id !== "string" || id === "") {
    throw commandError({
      code: "E_PARAM_MISSING",
      path: "/facts/mcu",
      got: id ?? null,
      expected: "a catalog MCU id, for example rp2040",
      hint: "the pullup read needs the receiving mcu; pass mcu in facts",
      record: pullupLowRead.id,
    });
  }
  return mcuPinRow(id, "/facts/mcu");
}

/**
 * A numeric fact, or E_PARAM_MISSING at its pointer. The def raises it
 * itself because facts.mcu is a string: the solver's fallback would name
 * the first non-numeric fact it saw read, which is mcu.
 */
function numFact(ctx: ConstraintCtx, key: string): number {
  const v = ctx.facts[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  throw commandError({
    code: "E_PARAM_MISSING",
    path: `/facts/${key}`,
    got: v ?? null,
    expected: "a finite number, ohm",
    hint: `fact ${key} is missing or not a finite number; pass it in facts`,
    record: pullupLowRead.id,
  });
}

/** True for the MCU's internal pullup, false for an external resistor. E_SCHEMA on any other value. */
function internal(ctx: ConstraintCtx): boolean {
  const p = ctx.facts["pullup"];
  if (p === "internal") return true;
  if (p === undefined || p === "external") return false;
  throw commandError({
    code: "E_SCHEMA",
    path: "/facts/pullup",
    got: p,
    expected: "internal or external",
    hint: "pullup is internal (the mcu row) or external (declare pullupOhm and pullupCeilOhm)",
    record: pullupLowRead.id,
  });
}

/** Pullup range in ohm: the internal row's range (a typical value is one point), or the declared external pullupOhm. */
export interface PullupRange {
  readonly minOhm: number;
  readonly maxOhm: number;
  /** Tier of the row the range came from; null for a declared external resistor. */
  readonly tier: Tier | null;
  /** One line naming where the range came from. */
  readonly from: string;
}

export function pullupRange(ctx: ConstraintCtx, row: McuPinRow = mcuRowOf(ctx)): PullupRange {
  if (!internal(ctx)) {
    const v = numFact(ctx, "pullupOhm");
    return { minOhm: v, maxOhm: v, tier: null, from: `declared external pullup ${String(v)} ohm` };
  }
  const ends = pullupEnds(row);
  const minOhm = Math.min(...ends);
  const maxOhm = Math.max(...ends);
  const span = ends.length === 1 ? `${String(minOhm)} ohm typical` : `${String(minOhm)} to ${String(maxOhm)} ohm`;
  return { minOhm, maxOhm, tier: row.tier, from: `${row.id} internal pullup ${span} (${row.tier})` };
}

/** The path budget the chain hands conductor.width: the largest whole-ohm path that reads LOW at the pullup range minimum. */
export interface PathBudget {
  readonly ohm: number;
  readonly tier: Tier | null;
  readonly reason: string;
}

/**
 * Budget from facts.mcu for a query that declares an MCU and no
 * netBudgetOhm (M01-T08 step 5); undefined when facts name no mcu. The
 * resistance floor reads it in place of netBudgetOhm.
 */
export function pullupPathBudget(ctx: ConstraintCtx): PathBudget | undefined {
  if (ctx.facts["mcu"] === undefined) return undefined;
  const row = mcuRowOf(ctx);
  const range = pullupRange(ctx, row);
  // Down to a whole ohm: a budget is a maximum, so its rounding never admits a path that reads UNDEFINED.
  const ohm = whole(maxPathOhm(row, range.minOhm), "down");
  return {
    ohm,
    tier: range.tier,
    reason: `largest path that reads LOW at ${row.id} pullup ${String(range.minOhm)} ohm, VIL ${volts(row.vilMaxV)} V (CHK-NET-05)`,
  };
}

/** R = pathOhm reads LOW only above the floor; the ceiling is the pullup the port can have. */
export const pullupLowRead: ConstraintDef = {
  id: "circuit/pullup-low-read",
  version: "1.0.0",
  dims: [PULLUP_DIM],
  kernels: ["circuit"],
  units: { [PULLUP_DIM]: "ohm" },
  bounds(dim, ctx): Bound[] {
    if (dim !== PULLUP_DIM) return [];
    const row = mcuRowOf(ctx);
    const R = numFact(ctx, "pathOhm");
    const floor = minPullupOhm(row, R);
    const lo: Bound = {
      value: floor, side: "lo", kernel: "circuit", source: "CHK-NET-05",
      reason: `pressed path ${String(R)} ohm reads LOW only above ${String(whole(floor, "up"))} ohm at VIL ${volts(row.vilMaxV)} V (${row.id}, ${row.tier})`,
      ...qualify([row.tier]),
    };
    if (!internal(ctx)) {
      const ceil = numFact(ctx, "pullupCeilOhm");
      return [lo, {
        value: ceil, side: "hi", kernel: "circuit", source: "CHK-NET-05",
        reason: `declared external pullup ceiling ${String(ceil)} ohm`,
        ...qualify([]),
      }];
    }
    const ends = pullupEnds(row);
    const top = Math.max(...ends);
    const what = ends.length === 1 ? `${String(top)} ohm typical, one point` : `maximum ${String(top)} ohm`;
    return [lo, {
      value: top, side: "hi", kernel: "circuit", source: "CHK-NET-05",
      reason: `${row.id} internal pullup ${what}, ${row.source}`,
      ...qualifyRow(row.tier),
    }];
  },
  expectedFor(dim, ceiling, ctx) {
    if (dim !== PULLUP_DIM) return null;
    const row = mcuRowOf(ctx);
    return {
      path: "/facts/pathOhm",
      got: ctx.facts["pathOhm"],
      expected: `path at most ${String(whole(maxPathOhm(row, ceiling), "down"))} ohm at pullup ${String(whole(ceiling, "down"))}`,
      nextDim: PULLUP_NEXT_DIM,
    };
  },
};

/** CHK-NET-05 verdict (M01-T08 step 4): the pullup range lies inside legal; measured is the range minimum, the worst end for LOW. */
export interface PullupVerdict {
  readonly measured: number;
  readonly verdict: "pass" | "fail";
}

export function pullupVerdict(legal: Interval["legal"], range: Pick<PullupRange, "minOhm" | "maxOhm">): PullupVerdict {
  const measured = range.minOhm;
  if (legal === null) return { measured, verdict: "fail" };
  const [lo, hi] = legal;
  const inside = (lo === null || range.minOhm >= lo) && (hi === null || range.maxOhm <= hi);
  return { measured, verdict: inside ? "pass" : "fail" };
}
