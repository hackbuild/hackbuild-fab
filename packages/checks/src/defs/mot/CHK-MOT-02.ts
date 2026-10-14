// CHK-MOT-02, programmed-path sweep clash-free (DAVIT 2026-08: collision
// was tested per slider pose with an explicit skip between the left and
// right arms, and a right-arm-only mask calibration missed the left arm's
// mirrored hub contacts). Every joint with a travel range is swept by the
// sim over that range at ogee16.sweepSteps placements, every obstacle
// included, none skipped by side; a swept share over ogee16.sweepClashMm3
// that no calibration mask keyed to this pose set excuses is a clash
// (D-135). Legal is zero clashes.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { fmt, skip } from "../common.js";
import { isSim, simOr } from "../asm/sim.js";

export const check = defineCheck({
  id: "CHK-MOT-02",
  level: "assembly",
  run: (t, ctx): readonly Finding[] => {
    const a = t.assembly;
    const sim = simOr(ctx, a);
    if (!isSim(sim)) return [sim];
    const moving = a.joints.filter((j) => j.range !== undefined && j.kind !== "fixed");
    if (moving.length === 0) return [skip({ level: "assembly", assembly: a.id }, "not run", `assembly ${a.id} has no joint with a travel range`)];
    const steps = ctx.profile.constant("ogee16.sweepSteps").value;
    const floor = ctx.profile.constant("ogee16.sweepClashMm3").value;
    let clashes = 0, poses = 0;
    let first: { joint: string; with: string; inst: string } | null = null;
    for (const j of moving) {
      const r = sim.sweep(j.b, j.id, steps);
      poses += r.poses;
      for (const c of r.clashes) {
        if (c.masked || !(c.mm3 > floor)) continue;
        clashes += 1;
        first ??= { joint: j.id, with: c.with, inst: j.b };
      }
    }
    return [{
      verdict: clashes === 0 ? "pass" : "fail", target: { level: "assembly", assembly: a.id, ...(first === null ? {} : { part: first.inst }) },
      measured: clashes, legal: { kind: "interval", lo: 0, hi: 0, unit: "count", nearest: 0 },
      constraint: `every joint swept over its whole range, every obstacle in, none skipped by side; a share over ${fmt(floor)} mm3 with no mask is a clash`,
      extra: { joints: moving.length, poses, ...(first === null ? {} : { firstJoint: first.joint, firstWith: first.with }) },
    }];
  },
});
