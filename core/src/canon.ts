// The canon registries as core runs them (M06): the archetype registry and
// the solvers its tier-1 package may not import, registered here at load
// by inversion (D-044). The click-spring archetype reads its FE curve
// through provideClickSolver: sim's SNAPFE_RIGID port, the clickerDims
// readout on the profile's click rules, and the beam modulus the
// archetype declares.

import type { ProfileLookup } from "@hackbuild/spec";
import { archetypes, provideClickSolver, type ClickCurve, type ClickSpringIn } from "@hackbuild/archetypes";
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

provideClickSolver(simClickCurve);

export { archetypes };
