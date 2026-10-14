// CHK-ASM-01, every screw has driver reach along driverAxis (DAVIT R4
// 2026-08-02: the roll and wrist horn screws were undrivable behind a D2.8
// waist; README_R4.md item 7). From the screw's head seat (its axis
// origin) a driver needs reachLen of clear line along driverAxis. The check
// walks that line through the part's built solid at 0.05 mm and reports the
// clear length before the first material.

import type { Finding, ScrewFeature } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { MeshProbe } from "../../solid/probe.js";
import { norm3 } from "../../solid/mesh.js";
import { bodyMeshes, boolFinding, featureTarget, fmt, isReason, skip } from "../common.js";

/** Sampling step along the driver line, mm: finer than the 0.4 mm thinnest printed wall. */
const STEP_MM = 0.05;

export const check = defineCheck<"feature", "screw">({
  id: "CHK-ASM-01",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: ScrewFeature = t.feature;
    const at = featureTarget(t.part, f);
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(at, "not run", got.reason)];
    const probe = new MeshProbe(got.meshes);
    const d = norm3(f.driverAxis);
    const clear = probe.clearAlong(f.axis.origin, d, f.reachLen, STEP_MM);
    const ok = clear >= f.reachLen - 1e-9;
    const hit = ok ? undefined : [f.axis.origin[0] + d[0] * clear, f.axis.origin[1] + d[1] * clear, f.axis.origin[2] + d[2] * clear] as const;
    return [boolFinding(hit === undefined ? at : { level: "feature", part: t.part.id, feature: f.id, at: hit },
      ok, `a ${f.thread} screw needs ${fmt(f.reachLen)} mm of clear line along its driver axis from the head seat`,
      { clearMm: Number(clear.toFixed(3)), reachMm: f.reachLen, stepMm: STEP_MM })];
  },
});
