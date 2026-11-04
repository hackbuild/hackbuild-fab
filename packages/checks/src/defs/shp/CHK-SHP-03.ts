// CHK-SHP-03, window roof carries itself: gabled or cone at 45 or steeper,
// or flat under 9 mm (DAVIT R4 2026-08-02, DETENT rev D 2026-07-30: gabled
// web windows and 45 deg cone roofs need no support; README_R4.md
// Printing, DETENT-build-notes.md "One window motif"). A flat roof is a
// bridge across the opening. In a vertical face (a window through a wall)
// the bridge is the roof itself: the outline's width along the face's
// horizontal axis at its highest part z. In any other face it is the longest
// span between supports across the outline, the CHK-PRT-09 measure. 9 mm is
// the same SLATE ceiling. A gabled or cone roof carries itself when its overhang from
// vertical is within profile constant overhang.maxDeg, the limit
// CHK-PRT-13 gates: its angle from horizontal at least 90 minus that.

import type { Finding, WindowFeature } from "@hackbuild/spec";
import { faceBasis } from "@hackbuild/geom";
import { defineCheck } from "../../registry.js";
import { openingSpan } from "../../solid/plan.js";
import { boolFinding, featureTarget, fmt, need } from "../common.js";
import { OVERHANG_CONSTANT, overhangLimit } from "../prt/overhang.js";
/** The flat span the title names, mm. */
export const FLAT_MAX_MM = 9;
/** Raster cell for the span, mm: a sampling choice well under the 9 mm ceiling. */
const CELL_MM = 0.05;

export const check = defineCheck<"feature", "window">({
  id: "CHK-SHP-03",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: WindowFeature = t.feature;
    const at = featureTarget(t.part, f);
    if (f.roof === "flat") {
      const roof = roofSpan(f);
      const span = roof ?? openingSpan([f.outline], CELL_MM)?.spanMm ?? 0;
      return [boolFinding(at, span < FLAT_MAX_MM,
        `a flat window roof bridges its opening; under ${fmt(FLAT_MAX_MM)} mm it carries itself`,
        roof === null ? { roof: "flat", spanMm: Number(span.toFixed(3)), gridMm: CELL_MM } : { roof: "flat", spanMm: Number(span.toFixed(3)), face: "vertical" })];
    }
    const angle = need(f.roofAngleDeg, `/features/${f.id}/roofAngleDeg`, `a ${f.roof} roof states its angle from horizontal`);
    const limit = overhangLimit(ctx.profile);
    const roofMin = 90 - limit.deg;
    return [boolFinding(at, angle >= roofMin,
      `a ${f.roof} roof at ${fmt(roofMin)} deg from horizontal or steeper prints without support (overhang from vertical within profile ${OVERHANG_CONSTANT} ${limit.deg}, ${limit.tier})`,
      { roof: f.roof, roofAngleDeg: angle, roofMinDeg: roofMin })];
  },
});

/** Part z within this of the highest outline point counts as the roof, mm. */
const ROOF_TOL_MM = 1e-6;

/**
 * The roof width of a window in a vertical face: the outline's extent along u
 * over the points at its highest part z (v = normal x u is vertical there, so
 * part z is origin z + y v.z). Null when the face is not vertical.
 */
export function roofSpan(f: WindowFeature): number | null {
  const b = faceBasis(f.face, `/features/${f.id}/face`);
  if (Math.abs(b.normal[2]) > ROOF_TOL_MM || Math.abs(b.u[2]) > ROOF_TOL_MM) return null;
  const z = f.outline.map((q) => q[1] * b.v[2]);
  const top = Math.max(...z);
  const xs = f.outline.filter((_, i) => top - z[i]! <= ROOF_TOL_MM).map((q) => q[0]);
  return Math.max(...xs) - Math.min(...xs);
}
