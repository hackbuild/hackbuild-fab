// The PIP click spring through SNAPFE: SNAPFE_RIGID as clickRigid and the
// clickerDims contact and stop strain as clickReadout, ported from
// originals/pip/files/haft-src/src/layout.js lines 81 to 113 (lineage row
// pip.layout/haft-9; pip-controller/src/layout.js holds the same lines).
// The rule lengths and the valley fraction are profile constants; the
// solver settings below are discretization, not physical rows.

import type { Constant, ProfileLookup, SnapCurve } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import { summarize, type Summary } from "./snapfe.js";

/** SNAPFE_RIGID solver settings (layout.js line 111). */
export const CLICK_FE = {
  /** Elements over the half span, count. */
  nel: 18,
  /** Displacement steps, count. */
  steps: 56,
  /** Centre travel at the last step as a multiple of the rise, ratio. */
  dmax: 2.0,
  /** Arches in the PIP click element (the double beam), count. */
  arches: 2,
} as const;

/** Click spring params as PIP declares them (layout.js line 36 `clicky`). */
export interface ClickSpring {
  /** Span between the end blocks, mm. */
  readonly l: number;
  /** Beam thickness in the bending plane, mm. */
  readonly t: number;
  /** Rise over thickness, ratio; rise h = Q t. */
  readonly Q: number;
  /** Beam width, mm. */
  readonly w: number;
  /** Young's modulus, MPa. */
  readonly E: number;
  /** Shuttle width, mm. */
  readonly sw: number;
}

/** Profile constants the click rules read. */
export const CLICK_RULE_IDS = {
  rigidSpanMin: "click.rigidSpanMin",
  contactPastPeak: "click.contactPastPeak",
  contactValleyFraction: "click.contactValleyFraction",
  stopOvertravel: "click.stopOvertravel",
} as const;

export interface ClickRules {
  /** Shortest flexing span the rigid shuttle leaves, mm. */
  readonly rigidSpanMinMm: number;
  /** Contact travel is at least this past the peak travel, mm. */
  readonly contactPastPeakMm: number;
  /** Contact travel is at least this fraction of the valley travel, ratio. */
  readonly contactValleyFraction: number;
  /** Strain at the stop is read up to this past contact travel, mm. */
  readonly stopOvertravelMm: number;
}

function rule(profile: Pick<ProfileLookup, "constant">, id: string, unit: string): number {
  const c: Constant = profile.constant(id);
  if (c.unit !== unit || !Number.isFinite(c.value) || !(c.value > 0)) {
    throw commandError({
      code: "E_SCHEMA", path: `/constants/${c.id}`, got: `${c.value} ${c.unit}`, expected: `a positive number in ${unit}`,
      hint: `set profile constant ${c.id} to a positive number in ${unit}`, record: "viewer-sim",
    });
  }
  return c.value;
}

/** The click rules from profile; a row in another unit or not positive is E_SCHEMA, a missing row E_REF. */
export function clickRules(profile: Pick<ProfileLookup, "constant">): ClickRules {
  return {
    rigidSpanMinMm: rule(profile, CLICK_RULE_IDS.rigidSpanMin, "mm"),
    contactPastPeakMm: rule(profile, CLICK_RULE_IDS.contactPastPeak, "mm"),
    contactValleyFraction: rule(profile, CLICK_RULE_IDS.contactValleyFraction, "ratio"),
    stopOvertravelMm: rule(profile, CLICK_RULE_IDS.stopOvertravel, "mm"),
  };
}

/** SNAPFE with the shuttle as a rigid centre of half width sw / 2, which shortens the flexing span (layout.js lines 108 to 113). */
export function clickRigid(p: ClickSpring, rules: ClickRules): Summary {
  const lEff = Math.max(rules.rigidSpanMinMm, p.l - p.sw * 0.5);
  return summarize({ l: lEff, h: p.Q * p.t, t: p.t, w: p.w, E: p.E, ...CLICK_FE });
}

/** SnapCurve plus the convergence verdict of the run behind it. */
export interface ClickReadout extends SnapCurve {
  /** False when any FE load step failed to converge. */
  readonly ok: boolean;
  /** One line per problem; a readout from a curve that did not converge says so here. */
  readonly warnings: readonly string[];
}

/** Contact travel and strain at the stop (layout.js lines 86 and 94 to 95), with the curve summary as SnapCurve. */
export function clickReadout(fe: Summary, rules: ClickRules): ClickReadout {
  const cg = Math.max(fe.dPeak + rules.contactPastPeakMm, rules.contactValleyFraction * fe.dValley);
  let eStop = 0;
  for (const p of fe.pts) if (p.d <= cg + rules.stopOvertravelMm + 1e-9) eStop = Math.max(eStop, p.e);
  const warnings = fe.ok ? [] : ["fe did not converge at every load step; the curve and this readout are not trusted"];
  return {
    peakN: fe.peak, peakAtMm: fe.dPeak, drop: fe.drop, contactMm: cg, eStopPct: eStop * 100,
    snaps: fe.snap, bistable: fe.bistable, ok: fe.ok, warnings,
  };
}
