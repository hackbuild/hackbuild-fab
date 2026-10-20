// reference/keys/access-switch/claim.ts
// The press claim (R1-flagship-access-switch-04), the design-local stopgap
// for the engine's function claims and toleranced values (plan v9 section
// 6, release 1): the drawn spring peak against a target band from profile.
// It imports spec types only, so build.ts and a baked bench can inline it,
// and it never runs the sim (build sandbox, D-178): the spread corners
// arrive as a table the claim test fills by calling packages/sim.
//
// The modulus is a working value and a 0.05 mm beam error moves the peak
// by about a third either way (computed), so the claim stays inferred and
// unproven until a person enters a coupon result (plan section 5).

import type { Metric, Qualifier } from "@hackbuild/spec";

/** Profile constants the claim reads. */
export const PRESS_IDS = {
  targetN: "access.pressTargetN",
  bandPct: "access.pressBandPct",
  beamPrintErrorMm: "click.beamPrintErrorMm",
  modulusSpreadPct: "click.modulusSpreadPct",
} as const;

/** The spring metric the claim holds to the band. */
export const PRESS_METRIC = "click-spring-key.0.spring.peakN";

/** Standard gravity, m/s2, exact by definition (CGPM 1901); for the gram column only. */
export const STANDARD_GRAVITY = 9.80665;

/** Newtons to grams-force. */
export const grams = (n: number): number => (n / STANDARD_GRAVITY) * 1000;

export interface PressBand {
  /** Target peak, N. */
  readonly targetN: number;
  readonly lo: number;
  readonly hi: number;
}

/** The target band: access.pressTargetN times 1 plus or minus access.pressBandPct / 100. */
export function pressBand(targetN: number, bandPct: number): PressBand {
  return { targetN, lo: targetN * (1 - bandPct / 100), hi: targetN * (1 + bandPct / 100) };
}

export type SpreadCorner = "drawn" | "t minus" | "t plus" | "E minus" | "E plus";

/** One corner of the spread: the beam thickness and modulus the sim ran at, and its peak. */
export interface SpreadRow {
  readonly corner: SpreadCorner;
  /** Beam thickness, mm. */
  readonly t: number;
  /** Modulus, MPa. */
  readonly E: number;
  /** SNAPFE peak, N, computed. */
  readonly peakN: number;
}

/** The five corners at drawn t and E: t and E each moved alone by the profile spreads. */
export function spreadCorners(t: number, E: number, beamPrintErrorMm: number, modulusSpreadPct: number): readonly Omit<SpreadRow, "peakN">[] {
  const f = modulusSpreadPct / 100;
  return [
    { corner: "drawn", t, E },
    { corner: "t minus", t: t - beamPrintErrorMm, E },
    { corner: "t plus", t: t + beamPrintErrorMm, E },
    { corner: "E minus", t, E: E * (1 - f) },
    { corner: "E plus", t, E: E * (1 + f) },
  ];
}

export interface PressClaim {
  readonly id: "press.peak";
  readonly targetN: number;
  readonly bandN: readonly [number, number];
  /** The drawn peak, N, computed. */
  readonly valueN: number;
  /** The qualifier the claim carries (RULES.md numbers), inferred until a coupon reading. */
  readonly tier: Qualifier;
  /** The drawn peak against the band. */
  readonly verdict: "in band" | "out of band";
  /** Lowest and highest corner peaks, N, and whether either leaves the band. */
  readonly spread: { readonly loN: number; readonly hiN: number; readonly exceedsBand: boolean; readonly rows: readonly SpreadRow[] };
  readonly status: "unproven until coupon";
}

/** The claim from the build's metrics, the band constants and the spread table. */
export function pressClaim(metrics: readonly Metric[], targetN: number, bandPct: number, rows: readonly SpreadRow[]): PressClaim {
  const v = metrics.find((m) => m.id === PRESS_METRIC)?.value;
  if (typeof v !== "number") throw new Error(`the press claim needs metric ${PRESS_METRIC}`);
  if (rows.length === 0) throw new Error("the press claim needs the spread table");
  const band = pressBand(targetN, bandPct);
  const peaks = rows.map((r) => r.peakN);
  const loN = Math.min(...peaks), hiN = Math.max(...peaks);
  return {
    id: "press.peak",
    targetN: band.targetN,
    bandN: [band.lo, band.hi],
    valueN: v,
    // A coupon reading is the only way past inferred; a narrow computed
    // spread over an inferred modulus would still be inferred.
    tier: "inferred",
    verdict: v >= band.lo && v <= band.hi ? "in band" : "out of band",
    spread: { loN, hiN, exceedsBand: loN < band.lo || hiN > band.hi, rows },
    status: "unproven until coupon",
  };
}
