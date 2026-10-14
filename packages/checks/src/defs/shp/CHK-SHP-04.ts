// CHK-SHP-04, a web meets its neighbour with real overlap, never a
// tangency (OGEE R16-M 2026-08: a tangent weld became six bodies after the
// print shrink). A web runs from a loose piece to the rest (spec/features.ts
// WebFeature, the skeletonise weld); both its ends must lie inside the
// body's plan outline by more than one 1/1024 mm grid step (D-054), since a
// weld that only touches separates when the print shrink or the snap moves
// an edge. The overlap is the smaller end depth.

import { MESH_GRID_PER_MM, type Finding, type WebFeature } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { depthInside } from "../../solid/plan.js";
import { bodyOf, featureTarget, fmt, intervalFinding, skip } from "../common.js";

const GRID_MM = 1 / MESH_GRID_PER_MM;

export const check = defineCheck<"feature", "web">({
  id: "CHK-SHP-04",
  level: "feature",
  run: (t): readonly Finding[] => {
    const f: WebFeature = t.feature;
    const at = featureTarget(t.part, f);
    const body = bodyOf(t.part, f);
    if (body.outline === undefined || body.outline.length === 0) return [skip(at, "not run", `body ${body.id} carries no plan outline (filled for prism and stack routes, D-224)`)];
    const a = depthInside(f.from, body.outline), b = depthInside(f.to, body.outline);
    const overlap = Math.min(a, b);
    return [intervalFinding(at, Number(overlap.toFixed(6)), GRID_MM, null, "mm",
      `a weld whose end only touches its neighbour parts on the print shrink; each end sits inside the outline by more than ${fmt(GRID_MM, 6)} mm`,
      { fromDepthMm: Number(a.toFixed(6)), toDepthMm: Number(b.toFixed(6)), thicknessMm: f.thickness })];
  },
});
