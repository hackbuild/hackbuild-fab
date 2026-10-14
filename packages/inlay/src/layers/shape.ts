// The art radius a face's layers are laid out against: the blank outline's
// smallest radius, less the rim band when the rim is on, less the art
// keepout, never under 2 mm (collar.html:733 to 744, R_RIM_IN and R_ART,
// lineage collar.bench/inlay-shape). Image layers scale to it; the collar-v5
// hygiene recipe clips to it. The outline functions are geom's COLLAR
// shapes.

import { outlineLUT, outlineMinR, type ShapeKind, type ShapeParams } from "@hackbuild/geom";

export interface FaceFrame {
  /** blank diameter, mm */
  readonly dia: number;
  readonly shape: ShapeParams & { readonly kind: ShapeKind };
  /** rim band: on, and its width w in mm */
  readonly rim: { readonly on: boolean; readonly w: number };
  /** keepout between the rim band (or the outline) and the art, mm */
  readonly keep: number;
}

/** Floor of the art radius, mm (collar.html:744, `Math.max(2, ...)`). */
export const ART_RADIUS_FLOOR = 2;

/** Inner radius of the rim band, mm (R_RIM_IN). */
export function rimInnerRadius(f: FaceFrame): number {
  const minR = outlineMinR(outlineLUT(f.shape.kind, f.shape, f.dia));
  return f.rim.on ? minR - f.rim.w : minR;
}

/** Radius the art is laid out against, mm (R_ART). */
export function artRadius(f: FaceFrame): number {
  return Math.max(ART_RADIUS_FLOOR, rimInnerRadius(f) - f.keep);
}
