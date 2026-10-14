// CHK-KEY-02, flex cap bridge at most 4.5 unsupported (PIP 2026-09: the
// conductive TPU cap spans the hole; pip.md 5.1 rules, model.js lines 521
// to 529: "cap bridge at most 4.5", "conductive TPU spanning the hole,
// unsupported"). Whatever covers a pocket prints its first layer over the
// pocket's opening as a bridge. In print pose the check slices the layer
// just above the pocket's face and the layer just below, counts every cell
// outside the pocket outline as support, and measures the longest span
// between supports inside the outline (the CHK-PRT-09 measure). A pocket
// open to its face has nothing over it and spans 0. PIP's limit is for a
// flex cap: a pocket whose first covering layer holds no flex or
// flex-conductor body (a cPLA flange over the BLOCKS stud socket, blocks.js
// line 177) skips with what covers it, and CHK-PRT-09 holds that bridge.

import type { BodyRole, Finding, Part, PocketFeature, Ring } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { inPrintPose, boundsOf } from "../../solid/mesh.js";
import { longestBridge } from "../../solid/layers.js";
import { gridOver, sliceMask } from "../../solid/slice.js";
import { fillRings } from "../../solid/plan.js";
import { toPart } from "../../skeleton/plan.js";
import { bodyMeshes, fmt, intervalFinding, isReason, featureTarget, presetOf, skip } from "../common.js";

/** The ceiling PIP's rule names, mm. */
export const CAP_BRIDGE_MAX_MM = 4.5;
/** Raster cell, mm: a sampling choice well under the 4.5 mm ceiling. */
const CELL_MM = 0.05;
/** The roles PIP's cap prints in: TPU and conductive TPU (pip.md 5.1 step 6). */
const FLEX_ROLES: ReadonlySet<BodyRole> = new Set<BodyRole>(["flex", "flex-conductor"]);

/** Bodies whose bounds take in the layer over the ring: "id (role material)", for the skip reason. */
function coverOf(part: Part, ring: Ring, z: number, layer: number): string[] {
  const xs = ring.map((q) => q[0]), ys = ring.map((q) => q[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return part.bodies.filter((b) => {
    const [lo, hi] = b.mesh.bbox;
    return lo[0] < x1 && hi[0] > x0 && lo[1] < y1 && hi[1] > y0 && lo[2] < z + layer && hi[2] > z;
  }).map((b) => `${b.id} (${b.role} ${b.material})`);
}

export const check = defineCheck<"feature", "pocket">({
  id: "CHK-KEY-02",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: PocketFeature = t.feature;
    const at = featureTarget(t.part, f);
    const [nx, ny, nz] = f.face.normal;
    if (nx !== 0 || ny !== 0 || nz !== 1 || f.face.u[2] !== 0) return [skip(at, "not run", `pocket ${f.id} opens on a face that is not an upward horizontal face; the bridge reads upward faces`)];
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(at, "not run", got.reason)];
    const { meshes, dz, rot } = inPrintPose(t.part, got.meshes);
    if (rot[0] !== 0 || rot[1] !== 0 || rot[2] !== 0) return [skip(at, "not run", `part ${t.part.id} turns into its print pose; the bridge reads parts printed as built`)];
    const p = presetOf(ctx, t.part.machine);
    const ring: Ring = f.outline.map((pt) => toPart(f.face, pt));
    const zTop = f.face.origin[2] + dz;
    const box = boundsOf(meshes);
    const g = gridOver(box, CELL_MM);
    const cur = sliceMask(meshes, zTop + p.layer / 2, g);
    const prev = sliceMask(meshes, zTop - p.layer / 2, g);
    const inside = fillRings([ring], g);
    for (let c = 0; c < prev.length; c++) if (inside[c] !== 1) prev[c] = 1;
    const b = longestBridge(cur, prev, g);
    const span = b === null ? 0 : Number(b.spanMm.toFixed(3));
    if (b !== null) {
      const flex = got.meshes.flatMap((_, i) => (FLEX_ROLES.has(t.part.bodies[i]!.role) ? [meshes[i]!] : []));
      const capped = flex.length > 0 && sliceMask(flex, zTop + p.layer / 2, g).some((v, c) => v === 1 && inside[c] === 1);
      if (!capped) {
        const over = coverOf(t.part, ring, f.face.origin[2], p.layer);
        return [skip(at, "not a flex cap",
          `the first layer over pocket ${f.id} is ${over.length === 0 ? "no flex body" : over.join(", ")}, no flex or flex-conductor body: PIP holds a flex cap bridge to ${fmt(CAP_BRIDGE_MAX_MM)} mm, and CHK-PRT-09 holds this ${fmt(span)} mm bridge`,
          { spanMm: span, capMaxMm: CAP_BRIDGE_MAX_MM, gridMm: CELL_MM })];
      }
    }
    return [intervalFinding(at, span, 0, CAP_BRIDGE_MAX_MM, "mm",
      `the first layer over a pocket bridges its opening; PIP holds a flex cap bridge to ${fmt(CAP_BRIDGE_MAX_MM)} mm`,
      { covered: b === null ? "no" : "yes", gridMm: CELL_MM })];
  },
});
