// CHK-PRT-08, horizontal bores are teardropped with the peak up (DETENT
// rev D 2026-07-30: two composed rotations sent the peak to -Z;
// DETENT-build-notes.md lines 13 to 21, detent_parts.py lines 16 to 19 and
// 230). A bore is horizontal when its axis in print pose is more than 45
// deg from build Z (spec/profile.ts PrintAxis). For a horizontal bore the
// declaration must ask for a teardrop, and the built solid must carry it
// upward: at the middle of the bore, a probe 1.2 r above the axis lies in
// the void (inside the teardrop's tip, which reaches r x sqrt 2) and a probe
// 1.2 r below lies in material. A peak sent to -Z swaps the two.

import type { BoreFeature, Finding, Vec3 } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { MeshProbe } from "../../solid/probe.js";
import { boundsOf, conj, norm3, rotate } from "../../solid/mesh.js";
import { printRotation } from "../../solid/mesh.js";
import { bodyMeshes, boolFinding, featureTarget, fmt, isReason, skip } from "../common.js";

/** Probe distance from the axis as a multiple of the bore radius, unitless: past the round (1.0), short of a 45 deg tip (sqrt 2). */
export const PEAK_PROBE = 1.2;

export const check = defineCheck<"feature", "bore">({
  id: "CHK-PRT-08",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: BoreFeature = t.feature;
    const at = featureTarget(t.part, f);
    const rot = printRotation(t.part);
    const dirPrint = norm3(rotate(rot, f.axis.dir));
    const tiltDeg = (Math.acos(Math.min(1, Math.abs(dirPrint[2]))) * 180) / Math.PI;
    if (tiltDeg <= 45) {
      return [boolFinding(at, true, "a vertical bore lies in the layer plane and needs no teardrop", { axisFromZDeg: Number(tiltDeg.toFixed(2)) })];
    }
    if (f.teardrop === false) {
      return [boolFinding(at, false, "a horizontal bore prints its roof as a bridge; declare teardrop auto or true", { axisFromZDeg: Number(tiltDeg.toFixed(2)), teardrop: "false" })];
    }
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(at, "not run", got.reason)];
    const probe = new MeshProbe(got.meshes);
    const dir = norm3(f.axis.dir);
    // The bore's middle: half its depth from the axis origin, or the middle of the part's extent along the axis when through.
    let mid: Vec3;
    if (f.depth === "through") {
      const box = boundsOf(got.meshes);
      const c: Vec3 = [(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2];
      const s = (c[0] - f.axis.origin[0]) * dir[0] + (c[1] - f.axis.origin[1]) * dir[1] + (c[2] - f.axis.origin[2]) * dir[2];
      mid = [f.axis.origin[0] + dir[0] * s, f.axis.origin[1] + dir[1] * s, f.axis.origin[2] + dir[2] * s];
    } else {
      mid = [f.axis.origin[0] + (dir[0] * f.depth) / 2, f.axis.origin[1] + (dir[1] * f.depth) / 2, f.axis.origin[2] + (dir[2] * f.depth) / 2];
    }
    // Print-pose up in the mesh frame, made perpendicular to the axis.
    const upMesh = rotate(conj(rot), [0, 0, 1]);
    const dot = upMesh[0] * dir[0] + upMesh[1] * dir[1] + upMesh[2] * dir[2];
    const up = norm3([upMesh[0] - dot * dir[0], upMesh[1] - dot * dir[1], upMesh[2] - dot * dir[2]]);
    const r = (PEAK_PROBE * f.d) / 2;
    const above: Vec3 = [mid[0] + up[0] * r, mid[1] + up[1] * r, mid[2] + up[2] * r];
    const below: Vec3 = [mid[0] - up[0] * r, mid[1] - up[1] * r, mid[2] - up[2] * r];
    const airAbove = !probe.inside(above);
    const solidBelow = probe.inside(below);
    return [boolFinding({ ...at, at: mid } as Finding["target"], airAbove && solidBelow,
      `a horizontal bore's roof prints as a 45 deg teardrop peak up; probes at ${PEAK_PROBE} r = ${fmt(r)} mm above and below the axis`,
      { axisFromZDeg: Number(tiltDeg.toFixed(2)), voidAbove: airAbove ? "yes" : "no", materialBelow: solidBelow ? "yes" : "no" })];
  },
});
