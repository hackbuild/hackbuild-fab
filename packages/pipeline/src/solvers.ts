// The solvers the archetypes take by inversion (D-044), registered from
// the one tier both core and a baked bench page load: the click spring's
// FE curve is sim's SNAPFE_RIGID port, the clickerDims readout on the
// profile's click rules, and the beam modulus the archetype declares.
// Core calls registerSolvers at load (core/src/canon.ts) and
// createPageBuild calls it before the first build, so a click archetype
// builds in both places through one solver.

import type { ProfileLookup } from "@hackbuild/spec";
import { provideClickSolver, type ClickCurve, type ClickSpringIn } from "@hackbuild/archetypes";
import { clickReadout, clickRigid, clickRules } from "@hackbuild/sim";

export function simClickCurve(s: ClickSpringIn, profile: ProfileLookup): ClickCurve {
  const rules = clickRules(profile);
  const fe = clickRigid(s, rules);
  const r = clickReadout(fe, rules);
  return {
    peakN: fe.peak, peakAtMm: fe.dPeak, valleyN: fe.valley, valleyAtMm: fe.dValley, drop: fe.drop,
    contactMm: r.contactMm, eStop: r.eStopPct / 100, snaps: fe.snap, bistable: fe.bistable, ok: fe.ok,
    pts: fe.pts.map((p) => ({ d: p.d, F: p.F })),
  };
}

let registered = false;

/** Registers every inverted solver once; a later call is a no-op. */
export function registerSolvers(): void {
  if (registered) return;
  provideClickSolver(simClickCurve);
  registered = true;
}
