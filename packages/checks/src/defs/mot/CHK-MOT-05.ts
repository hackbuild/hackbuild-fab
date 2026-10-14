// CHK-MOT-05, the latch identity (origin OGEE R17b 2026-08-15, stipple
// (1).html; CHECKS.md section 7.7): margin + overshoot = (full rise - half
// rise) - cam lift - LUG_TOT, every figure from the machine's kinematics and
// the half rise measured, never taken as stroke/2. The seeded stroke/2 form
// holds only where the half rise is exactly half (the STIPPLE beam) and
// misses R16 by 0.25 mm (computed). Measured is the residual, left side
// minus right side; legal is within profile latch.identityTolMm of 0.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { fmt, intervalFinding } from "../common.js";
import { isMotion, motionOr } from "./motion.js";

export const check = defineCheck({
  id: "CHK-MOT-05",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const target = { level: "part", part: t.part.id } as const;
    const m = motionOr(ctx, target);
    if (!isMotion(m)) return [m];
    const tol = ctx.profile.constant("latch.identityTolMm").value;
    const r = m.latchIdentity();
    const mechanism = t.part.assertions.find((a) => a.type === "identity");
    return [intervalFinding(
      target, r.lhsMm - r.rhsMm, -tol, tol, "mm",
      `margin + overshoot equals (full rise - half rise) - cam lift - LUG_TOT within ${fmt(tol)} mm (latch.identityTolMm), the half rise measured from the kinematics`,
      {
        machine: r.machine, ...(mechanism?.type === "identity" ? { mechanism: mechanism.mechanism } : {}),
        marginMm: r.marginMm, overshootMm: r.overshootMm, fullRiseMm: r.fullRiseMm, halfRiseMm: r.halfRiseMm,
        camLiftMm: r.camLiftMm, lugTotMm: r.lugTotMm, lhsMm: r.lhsMm, rhsMm: r.rhsMm,
      },
    )];
  },
});
