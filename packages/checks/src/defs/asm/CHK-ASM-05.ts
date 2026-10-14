// CHK-ASM-05, anything with a rotational DOF gets a swept-volume check
// (OGEE R16-P 2026-08: every pin head swept into its own servo; 682 mm3 per
// bar crank by the per-step sum, D-233). Selected by joint kind prismatic
// or planar (D-177, CHECKS.md 7.7: the v3 pin_in_slot moved to joints).
// For each such joint the sim sweeps the moving instance over the joint's
// range at ogee16.sweepSteps placements (check_sweep.py's 25) and reports
// what the swept region shares with each obstacle (packages/sim sweep,
// M02-T07); a share over ogee16.sweepClashMm3 that no calibration mask
// excuses is a clash (scenes.ts, the declared threshold). Legal is 0 mm3.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { fmt } from "../common.js";
import { isSim, simOr } from "./sim.js";

export const check = defineCheck({
  id: "CHK-ASM-05",
  level: "assembly",
  run: (t, ctx): readonly Finding[] => {
    const a = t.assembly;
    const sim = simOr(ctx, a);
    if (!isSim(sim)) return [sim];
    const steps = ctx.profile.constant("ogee16.sweepSteps").value;
    const floor = ctx.profile.constant("ogee16.sweepClashMm3").value;
    return a.joints.filter((j) => j.kind === "prismatic" || j.kind === "planar").map((j) => {
      const r = sim.sweep(j.b, j.id, steps);
      const hits = r.clashes.filter((c) => !c.masked && c.mm3 > floor);
      const total = Number(hits.reduce((s, c) => s + c.mm3, 0).toFixed(3));
      const first = hits[0];
      return {
        verdict: total === 0 ? "pass" : "fail",
        target: { level: "assembly", assembly: a.id, part: j.b },
        measured: total,
        legal: { kind: "interval", lo: 0, hi: 0, unit: "mm3", nearest: 0 },
        constraint: `joint ${j.id} swept over ${r.poses} poses; a swept share over ${fmt(floor)} mm3 with no calibration mask is a clash`,
        extra: { joint: j.id, poses: r.poses, clashes: hits.length, ...(first === undefined ? {} : { with: first.with }) },
      } satisfies Finding;
    });
  },
});
