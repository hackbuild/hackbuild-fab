// The overhang rule CHK-PRT-12, CHK-PRT-13 and CHK-SHP-03 share, ported
// from PAWL fdm.py analyse() (originals/pawl/files/src/fdm.py lines 27 to
// 50). One implementation of each part of it lives here:
//
// - the limit, profile constant overhang.maxDeg, deg from vertical;
// - the bed contact band, profile constant overhang.bedBandMm: a triangle
//   whose highest vertex sits less than the band above the lowest point of
//   the part sits on the plate and is not an overhang (fdm.py line 43,
//   on_bed = (tri_hi - lo) < 0.35);
// - the boundary: a face overhangs when it turns down past the limit. A
//   face at the limit is at it, not past it. fdm.py's docstring counts
//   area "beyond 45 degrees" and its 45 deg roofs need no support, but its
//   test `ang <= 45` runs in float32 off numpy-stl, so a modelled 45 deg
//   chamfer lands either side by rounding: on the PAWL foot export 6 of 8
//   such faces flip between float32 and float64 (computed). Here a face
//   within AT_LIMIT_DEG of the limit sits at it. That covers the float32
//   coordinates of an exported 45 deg face (PAWL thigh, 6.8e-6 deg over)
//   and the D-054 snap of a 45 deg teardrop roof (45.00002, the CHK-PRT-13
//   pass fixture), both computed; CHK-PRT-13 widens it per face by the
//   snap allowance its gate needs.

import type { ProfileLookup } from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";
import { checkError } from "../common.js";

/** Profile constant holding the overhang limit, deg from vertical. */
export const OVERHANG_CONSTANT = "overhang.maxDeg";

/** Profile constant holding the bed contact band above the lowest point, mm (PAWL fdm.py line 43). */
export const BED_BAND_CONSTANT = "overhang.bedBandMm";

/** A face within this of the limit sits at it, deg: float rounding of a modelled face, never a design angle. */
export const AT_LIMIT_DEG = 1e-4;

/** The overhang limit row, deg from vertical; a row in another unit or outside 0 to 90 is E_SCHEMA. */
export function overhangLimit(profile: Pick<ProfileLookup, "constant">): { readonly deg: number; readonly tier: string } {
  const c = profile.constant(OVERHANG_CONSTANT);
  if (c.unit !== "deg" || !Number.isFinite(c.value) || !(c.value > 0 && c.value < 90)) {
    throw checkError({
      code: "E_SCHEMA", path: `/constants/${c.id}`, got: `${c.value} ${c.unit}`, expected: "an angle in deg between 0 and 90",
      hint: `set profile constant ${c.id} to an angle from vertical in deg`, record: "verification",
    });
  }
  return { deg: c.value, tier: c.provenance.tier };
}

/** The bed contact band row, mm; a row in another unit or not positive is E_SCHEMA. */
export function bedBand(profile: Pick<ProfileLookup, "constant">): { readonly mm: number; readonly tier: string } {
  const c = profile.constant(BED_BAND_CONSTANT);
  if (c.unit !== "mm" || !Number.isFinite(c.value) || !(c.value > 0)) {
    throw checkError({
      code: "E_SCHEMA", path: `/constants/${c.id}`, got: `${c.value} ${c.unit}`, expected: "a positive length in mm",
      hint: `set profile constant ${c.id} to the bed contact band in mm`, record: "verification",
    });
  }
  return { mm: c.value, tier: c.provenance.tier };
}

/** Angle of a face from vertical by its unit normal z, deg: a wall reads 0, a face turned fully down 90, an upward face less than 0. */
export function fromVerticalDeg(nz: number): number {
  return (Math.asin(Math.max(-1, Math.min(1, -nz))) * 180) / Math.PI;
}

/** True when a face with unit normal z turns down past limitDeg from vertical; a face at the limit is not past it. */
export function pastLimit(nz: number, limitDeg: number): boolean {
  return fromVerticalDeg(nz) > limitDeg + AT_LIMIT_DEG;
}

/** Highest z of triangle k, mm. */
export function triTopZ(m: MeshData, k: number): number {
  const p = m.positions, tr = m.triangles;
  return Math.max(p[tr[k * 3]! * 3 + 2]!, p[tr[k * 3 + 1]! * 3 + 2]!, p[tr[k * 3 + 2]! * 3 + 2]!);
}

/** True when triangle k of a mesh in print pose (lowest point at z 0) sits on the plate: its highest vertex under the band, mm. */
export function onBed(m: MeshData, k: number, bandMm: number): boolean {
  return triTopZ(m, k) < bandMm;
}
