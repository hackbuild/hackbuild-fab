// CHK-PRT-13, overhang in print pose at most the profile limit, separate
// from islands (DETENT rev C 2026-07-30: verify_revC.py slice_scan reported
// the region hanging past the layer below by more than one layer height, a
// 45 deg violation, as information and gated only islands farther than
// 3 mm from that layer, so the inverted laser teardrop of wall B shipped;
// originals/detent/files/revD/archive-revC/verify_revC.py lines 201 to 237).
//
// The limit is profile constant overhang.maxDeg. The overhang angle of a
// face is measured per triangle normal against the build direction, as
// CHK-PRT-12 ports PAWL fdm.py, with the same bed contact band left out: a
// triangle whose highest vertex sits under the band (overhang.ts). A
// face facing straight down is a bridge, which CHK-PRT-09 gates by span;
// its area is reported here and does not move the verdict. Measured is the
// steepest overhang of any other face; extra carries the area past the
// limit, the metric DETENT printed ungated (CHECKS.md section 11). As
// CHK-PRT-05 lets a face within one 1/1024 mm mesh step of a layer top
// pass, a face passes when the snap (D-054) alone could tilt it past the
// limit: the allowance is the angle one grid step makes across the face's
// smallest altitude. A correct teardrop's 45 deg roof reads 45.00002 after
// the snap (computed on the CHK-PRT-13 pass fixture).

import { MESH_GRID_PER_MM, type Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { inPrintPose, triNormal } from "../../solid/mesh.js";
import { bodyMeshes, intervalFinding, isReason, partTarget, skip } from "../common.js";
import { AT_LIMIT_DEG, BED_BAND_CONSTANT, OVERHANG_CONSTANT, bedBand, fromVerticalDeg, onBed, overhangLimit } from "./overhang.js";

const GRID_MM = 1 / MESH_GRID_PER_MM;
const DEG = 180 / Math.PI;

/** A face whose unit normal has z at most this faces straight down, unitless (within 0.08 deg; CHK-PRT-05's horizontal test). */
const DOWN_NZ = -(1 - 1e-6);

function edgeLength(p: Float64Array, i: number, j: number): number {
  return Math.hypot(p[j * 3]! - p[i * 3]!, p[j * 3 + 1]! - p[i * 3 + 1]!, p[j * 3 + 2]! - p[i * 3 + 2]!);
}

export const check = defineCheck({
  id: "CHK-PRT-13",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(at, "not run", got.reason)];
    const row = overhangLimit(ctx.profile);
    const limit = row.deg;
    const band = bedBand(ctx.profile);
    const { meshes } = inPrintPose(t.part, got.meshes);
    let worst = 0, worstZ = 0, pastArea = 0, bridgeArea = 0;
    for (const m of meshes) {
      const p = m.positions, tr = m.triangles;
      for (let k = 0; k < tr.length / 3; k++) {
        const { n, area } = triNormal(m, k);
        if (area === 0) continue;
        const nz = n[2] / (2 * area);
        if (nz >= 0) continue;
        if (onBed(m, k, band.mm)) continue;
        const zc = (p[tr[k * 3]! * 3 + 2]! + p[tr[k * 3 + 1]! * 3 + 2]! + p[tr[k * 3 + 2]! * 3 + 2]!) / 3;
        if (nz <= DOWN_NZ) {
          bridgeArea += area;
          continue;
        }
        const deg = fromVerticalDeg(nz);
        const longest = Math.max(...[0, 1, 2].map((e) => edgeLength(m.positions, tr[k * 3 + e]!, tr[k * 3 + ((e + 1) % 3)]!)));
        const snapDeg = Math.max(AT_LIMIT_DEG, Math.atan(GRID_MM / ((2 * area) / longest)) * DEG);
        const read = deg <= limit + snapDeg ? Math.min(deg, limit) : deg;
        if (read > limit) pastArea += area;
        if (read > worst) {
          worst = read;
          worstZ = zc;
        }
      }
    }
    return [intervalFinding(at, Number(worst.toFixed(3)), 0, limit, "deg",
      `overhang from vertical at most ${limit} deg (profile ${OVERHANG_CONSTANT}, ${row.tier}) in print pose, bed band ${band.mm} mm (profile ${BED_BAND_CONSTANT}, ${band.tier}) left out; faces facing straight down are bridges for CHK-PRT-09`,
      {
        overhangAreaMm2: Number(pastArea.toFixed(2)), bridgeAreaMm2: Number(bridgeArea.toFixed(2)),
        worstZMm: Number(worstZ.toFixed(3)), limitDeg: limit, bedBandMm: band.mm,
      })];
  },
});
