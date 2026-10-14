// The displacement-coincidence-latch bodies of OGEE16 R16-P, ported from
// originals/ogee16/files/src/source/ogee16.scad: the rod p_rod() (lines 68
// to 80, its lug and its ramped foot notch) and the latch plate p_latch()
// (lines 221 to 233), with the params.scad (lineage ogee16.params/r16p)
// dimensions. Each profile is the original's own 2D construction, in the
// sheet's own plane, written out as the ring OpenSCAD's union and
// difference leave for it; the vertex order is the order the original's
// DXF export (exports/ogee16-cut.zip dxf/rod.dxf, dxf/latch.dxf) lists.
// A param set that changes the construction's topology (the lug no longer
// crossing the rod edge, the notch ceiling leaving the rod) is refused with
// E_SCHEMA rather than drawn as a different shape.

import { commandError, qualify, type ApplyIn, type MechanismApplyOut, type Vec2 } from "@hackbuild/spec";
import type { Values } from "../derive/common.js";
import { coincidenceLatchDerive } from "../derive/coincidence-latch.js";
import { wind } from "../tumbler/generate.js";

const rad = (d: number): number => (d * Math.PI) / 180;

function refuse(what: string, got: number, expected: string): never {
  throw commandError({ code: "E_SCHEMA", path: `/params/${what}`, got: String(got), expected, hint: `the rod profile of ogee16.scad p_rod() needs ${expected}; move ${what} back inside it` });
}

/**
 * p_rod(): rect(-PIN_W/2, PIN_BOTL, PIN_W/2, PIN_TOPL) union the lug
 * polygon on +x, minus the foot notch whose ceiling is ceil_v(u) =
 * -(u - (T/2 - PIN_PLAY)) tan(RAMP_A). PIN_BOTL = -NOTCH_D, PIN_TOPL =
 * FACE2_Z + T - CROWN_TOP with FACE2_Z = FACE_Z + T and CROWN_TOP = ROD_Z +
 * CROWN_R, ZL = Z_LUG0 - CROWN_TOP with Z_LUG0 = LP_Z + LP_T - R_LATCH.
 */
export function ogeeRodProfile(p: Values): Vec2[] {
  const T = p["T"]!;
  const xR = p["pinW"]! / 2;
  const crownTop = p["rodZ"]! + p["crownR"]!;
  const yB = -p["notchD"]!;
  const yT = p["faceZ"]! + T + T - crownTop;
  const zl = p["lpZ"]! + T - p["rLatch"]! - crownTop;
  const lugX = xR + p["lugP"]!;
  const lugH = zl + p["lugH"]!;
  const lugTop = lugH + p["lugRamp"]!;
  const pinPlay = (p["notchW"]! - T) / 2;
  const ceilV = (u: number): number => -(u - (T / 2 - pinPlay)) * Math.tan(rad(p["rampA"]!));
  const nw = p["notchW"]! / 2;
  const cL = ceilV(-nw);
  const cR = ceilV(nw);
  if (!(nw < xR)) refuse("notchW", p["notchW"]!, "a notch narrower than the rod, notchW < pinW");
  if (!(cR > yB && cL < zl)) refuse("rampA", p["rampA"]!, "a notch ceiling inside the rod, above its foot and below the lug");
  if (!(zl > yB && lugTop < yT && p["lugP"]! > 0 && p["lugH"]! >= 0 && p["lugRamp"]! > 0)) refuse("rLatch", p["rLatch"]!, "a lug on the rod's side between its foot and its tenon top");
  // The ramp edge runs from (lugX, lugH) to (xR - EPS, lugTop); OpenSCAD's union cuts it where it crosses x = xR.
  const yI = lugH + (p["lugRamp"]! * (lugX - xR)) / (lugX - (xR - p["eps"]!));
  return [
    [xR, zl], [lugX, zl], [lugX, lugH], [xR, yI], [xR, yT], [-xR, yT], [-xR, yB],
    [-nw, yB], [-nw, cL], [nw, cR], [nw, yB], [xR, yB],
  ];
}

/** The latch plate's params.scad dimensions: the machine body the rods latch on (machines/ogee-cell). */
export const LATCH_PLATE_DEFAULTS: Readonly<Record<string, number>> = {
  T: 3, N: 4, pitch: 34, fitSlip: 0.4, printOver: 0.15, slotB: -9.1, slotE: 6.05,
  lpX0: -34, lpX1: 140, lpY0: -34, lpY1: 140, lsvX: 124, lsvY: 120, lcrankR: 6, lpSlide: 3,
};

export interface PlateProfile {
  readonly outer: Vec2[];
  /** The rod slots, cell by cell (j outer, i inner, as the original's for loop), then the drive slot. */
  readonly holes: Vec2[][];
}

const rect = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [[x0, y0], [x0, y1], [x1, y1], [x1, y0]];

/**
 * p_latch() at DIAG 0: the hull of two rectangles inset 8 (a chamfered
 * rectangle), one rod slot rect(-SLOT_X/2, SLOT_B, SLOT_X/2, SLOT_E) per
 * cell at (px(j), py(i)), SLOT_X = T + FIT_PSLIP with FIT_PSLIP = FIT_SLIP
 * + PRINT_OVER + 0.15, and the drive slot 12 long and T + FIT_SLIP wide
 * centred on the latch crank pin at rest: LDRIVE_U0, U1 = LCRANK_R
 * cos(LCRANK_SW) -+ 6, LDRIVE_V = -LCRANK_R sin(LCRANK_SW), LCRANK_SW =
 * asin(LP_SLIDE / (2 LCRANK_R)). The original rotates the cells and the
 * drive slot by DIAG, which params.scad sets to 0.
 */
export function ogeeLatchPlateProfile(q: Readonly<Record<string, number>> = LATCH_PLATE_DEFAULTS): PlateProfile {
  const v = (k: string): number => q[k]!;
  const slotX = v("T") + v("fitSlip") + v("printOver") + 0.15;
  const sw = Math.asin(v("lpSlide") / (2 * v("lcrankR")));
  const u0 = v("lcrankR") * Math.cos(sw) - 6;
  const u1 = v("lcrankR") * Math.cos(sw) + 6;
  const dv = -v("lcrankR") * Math.sin(sw);
  const half = (v("T") + v("fitSlip")) / 2;
  const [x0, x1, y0, y1] = [v("lpX0"), v("lpX1"), v("lpY0"), v("lpY1")];
  const outer: Vec2[] = [
    [x1, y0 + 8], [x1, y1 - 8], [x1 - 8, y1], [x0 + 8, y1], [x0, y1 - 8], [x0, y0 + 8], [x0 + 8, y0], [x1 - 8, y0],
  ];
  const holes: Vec2[][] = [];
  const n = Math.round(v("N"));
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cx = j * v("pitch");
      const cy = i * v("pitch");
      holes.push(rect(cx - slotX / 2, cy + v("slotB"), cx + slotX / 2, cy + v("slotE")));
    }
  }
  holes.push(rect(v("lsvX") + u0, v("lsvY") + dv - half, v("lsvX") + u1, v("lsvY") + dv + half));
  return { outer, holes };
}

/**
 * apply() of displacement-coincidence-latch (D-177): the rod with its lug
 * and foot notch as one prism body in the face plane at the face origin,
 * T thick, cut from the chase's slot 1; the half select margin as the
 * latch.margin metric gated by CHK-MOT-05; and the identity assertion
 * keyed by the mechanism id. The latch plate is the machine's body
 * (machines/ogee-cell), so it is ported above and not placed here.
 */
export function coincidenceLatchApply(input: ApplyIn<Values>): MechanismApplyOut {
  const p = input.params;
  const o = input.face.origin;
  const ring = ogeeRodProfile(p).map(([x, y]): Vec2 => [x + o[0], y + o[1]]);
  const d = coincidenceLatchDerive(p);
  const margin = d["margin"]!;
  return {
    bodies: [{ id: "rod", role: "body", slot: 1, material: "", base: { route: "prism", outline: [wind(ring, true)], z: [o[2], o[2] + p["T"]!] } }],
    features: [],
    metrics: [{
      id: "latch.margin", value: margin.value, unit: "mm", note: "half select margin, plate top minus lug top (kin.py); must stay positive",
      gate: "CHK-MOT-05", drivenBy: ["/stroke", "/lpZ", "/rLatch", "/lugH", "/lugRamp", "/crownOff"], ...qualify([]),
    }],
    assertions: [{ type: "identity", mechanism: "displacement-coincidence-latch" }],
  };
}
