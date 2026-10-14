// The two insets behind the CHK-3MF-04 split (D-070). Both are true
// edge-normal Miter offsets of the outline. A homothety about the centroid
// was tried first and pushed COLLAR spirals into the wall. Distances are
// read from profile so the inset never carries a number of its own.

import type { ProfileLookup } from "@hackbuild/spec";
import { geomError, type Section } from "./cs.js";

/** The profile read geom needs: named constants with provenance. */
export type ConstantSource = Pick<ProfileLookup, "constant">;

/** Profile constant ids geom reads. */
export const GEOM_CONSTANTS = {
  coincidenceInset: "3mf.coincidenceInset",
  pinchInset: "3mf.pinchInset",
  sliverMin: "geom.sliverMin.n04",
} as const;

/** A length constant read from profile, mm; a constant in another unit is refused. */
export function constantMm(profile: ConstantSource, id: string): number {
  const c = profile.constant(id);
  if (c.unit !== "mm" || !(c.value > 0)) {
    throw geomError({ code: "E_SCHEMA", path: `/constants/${id}`, got: `${c.value} ${c.unit}`, expected: "a positive length in mm", hint: `set profile constant ${id} to a positive length in mm` });
  }
  return c.value;
}
const mm = constantMm;

/** Coincidence inset: offset(-constant('3mf.coincidenceInset'), Miter), 0.001 mm at tier inferred (M00-T02 step 9). */
export function insetCoincident(cs: Section, profile: ConstantSource): Section {
  return cs.offset(-mm(profile, GEOM_CONSTANTS.coincidenceInset), { join: "Miter" });
}

/** Pinch inset: offset(-constant('3mf.pinchInset'), Miter), 0.02 mm at tier inferred (COTTER applyArt HAIR). */
export function insetPinch(cs: Section, profile: ConstantSource): Section {
  return cs.offset(-mm(profile, GEOM_CONSTANTS.pinchInset), { join: "Miter" });
}
