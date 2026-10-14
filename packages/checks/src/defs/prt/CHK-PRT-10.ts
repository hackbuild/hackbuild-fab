// CHK-PRT-10, inner and outer wall lines parallel on every cone (STYLUS
// 2026-08: a non-parallel cone left a sub-line-width wall). The rule the
// knowledge records state is "inner and outer wall lines PARALLEL;
// horizontal wall = wallT / sin(theta)" (knowledge-tiers.md line 370; PIP
// flexDims wallH = wall / sin(90 - alpha), layout.js 149 to 160): a cone
// shell keeps one horizontal wall thickness over its height. The check
// probes the built solid on the boss axis: at five heights and eight
// bearings it measures the horizontal wall from the inner surface to the
// outer one, and the walls must agree. A boss solid on its axis has one
// wall line and passes.

import type { BossFeature, Finding, Vec3 } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { MeshProbe } from "../../solid/probe.js";
import { basisPerp, norm3 } from "../../solid/mesh.js";
import { bodyMeshes, boolFinding, featureTarget, fmt, isReason, skip } from "../common.js";

/** Heights along the boss as fractions of h, unitless: clear of the root fillet and the top. */
const HEIGHTS = [0.2, 0.35, 0.5, 0.65, 0.8] as const;
const BEARINGS = 8;
/** Probe step and bisection tolerance, mm: a sampling choice, finer than the 0.42 line it guards. */
const STEP = 0.02;
const TOL = 0.002;
/** Spread allowed between the walls, mm: a 64-segment cone on a 6 mm boss moves a chord by at most 0.0072 (computed). */
export const PARALLEL_TOL_MM = 0.02;

export const check = defineCheck<"feature", "boss">({
  id: "CHK-PRT-10",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: BossFeature = t.feature;
    const at = featureTarget(t.part, f);
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(at, "not run", got.reason)];
    const probe = new MeshProbe(got.meshes);
    const dir = norm3(f.axis.dir);
    const [u, v] = basisPerp(dir);
    const walls: number[] = [];
    let solidAxis = 0;
    for (const frac of HEIGHTS) {
      const c: Vec3 = [f.axis.origin[0] + dir[0] * f.h * frac, f.axis.origin[1] + dir[1] * f.h * frac, f.axis.origin[2] + dir[2] * f.h * frac];
      if (probe.inside(c)) {
        solidAxis += 1;
        continue;
      }
      for (let b = 0; b < BEARINGS; b++) {
        const a = (2 * Math.PI * b) / BEARINGS;
        const w: Vec3 = [u[0] * Math.cos(a) + v[0] * Math.sin(a), u[1] * Math.cos(a) + v[1] * Math.sin(a), u[2] * Math.cos(a) + v[2] * Math.sin(a)];
        const pt = (s: number): Vec3 => [c[0] + w[0] * s, c[1] + w[1] * s, c[2] + w[2] * s];
        let s = STEP;
        while (s <= f.d && !probe.inside(pt(s))) s += STEP;
        if (s > f.d) continue;
        const rIn = (probe.crossing(pt(s - STEP), pt(s), TOL) ?? 0) + s - STEP;
        while (s <= 2 * f.d && probe.inside(pt(s))) s += STEP;
        const rOut = (probe.crossing(pt(s - STEP), pt(s), TOL) ?? 0) + s - STEP;
        walls.push(rOut - rIn);
      }
    }
    if (walls.length === 0) {
      return [boolFinding(at, true, "a boss solid on its axis has one wall line; nothing to keep parallel", { solidSamples: solidAxis })];
    }
    const lo = Math.min(...walls), hi = Math.max(...walls);
    return [boolFinding(at, hi - lo <= PARALLEL_TOL_MM,
      `a cone shell keeps one horizontal wall (wall / sin theta) over its height; spread at most ${fmt(PARALLEL_TOL_MM)} mm over ${HEIGHTS.length} heights and ${BEARINGS} bearings`,
      { wallMinMm: Number(lo.toFixed(4)), wallMaxMm: Number(hi.toFixed(4)), samples: walls.length })];
  },
});
