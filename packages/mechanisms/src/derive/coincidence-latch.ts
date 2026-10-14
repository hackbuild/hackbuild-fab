// displacement-coincidence-latch, OGEE16 R16-P kinematics
// (originals/ogee16/files/src/source/kin.py rocker lines 61 to 72, ceil_v
// 82 to 83, CAM and CAMLIFT 89 to 90, pin_state 94 to 125, and the
// __main__ readout 144 to 166; lineage ogee16.kin/r16p), with the defaults
// of params.scad (lineage ogee16.params/r16p) lines 18 to 96. The identity
// CHK-MOT-05 checks: margin + overshoot = (full rise - half rise) - cam lift
// - LUG_TOT, which is stroke/2 - cam lift - LUG_TOT only where the half
// rise is exactly half the stroke (the STIPPLE beam). OGEE16's crown offset
// puts its half rise at 4.249, not 4.5. The same formulas are ported for
// the OGEE motion programs in packages/motion/src/kinematics/ogee.ts;
// mechanisms and motion are both tier 1 and may not import each other.

import type { DerivedValue } from "@hackbuild/spec";
import { computed, type InputParam, type Values } from "./common.js";

export const COINCIDENCE_LATCH_PARAMS: readonly InputParam[] = [
  { key: "T", unit: "mm", doc: "sheet thickness (params.scad line 18)", default: 3 },
  { key: "stroke", unit: "mm", doc: "row and column bar stroke (line 43)", default: 9 },
  { key: "C", unit: "mm", doc: "rocker half length (line 40)", default: 9 },
  { key: "rodZ", unit: "mm", doc: "pivot centre height (line 49)", default: 48 },
  { key: "crownR", unit: "mm", doc: "crown radius (line 60)", default: 11 },
  { key: "crownOff", unit: "mm", doc: "crown arc centre offset past the rocker midpoint (line 62)", default: 0.5 },
  { key: "rLatch", unit: "mm", doc: "rise at which the lug latches (line 71)", default: 7.6 },
  { key: "lpZ", unit: "mm", doc: "latch plate bottom (line 72)", default: 77 },
  { key: "pinW", unit: "mm", doc: "rod pin width (line 80)", default: 10 },
  { key: "lugP", unit: "mm", doc: "lug proud of the pin (line 81)", default: 1.25 },
  { key: "lugH", unit: "mm", doc: "lug flat height (line 82)", default: 0.6 },
  { key: "lugRamp", unit: "mm", doc: "lug ramp height (line 83)", default: 1.2 },
  { key: "notchW", unit: "mm", doc: "foot notch width (line 85)", default: 4.45 },
  { key: "rampA", unit: "deg", doc: "foot slot ceiling ramp (line 88); floor coincidence.rampMinDeg", default: 40 },
  { key: "slotE", unit: "mm", doc: "plate slot edge from the rod axis (line 93)", default: 6.05 },
  { key: "faceZ", unit: "mm", doc: "lower face bottom; the rod tenon top is FACE_Z + 2 T - CROWN_TOP (line 75, PIN_TOPL line 90)", default: 91 },
  { key: "notchD", unit: "mm", doc: "foot notch depth; the rod foot is at -NOTCH_D (line 87, PIN_BOTL line 89)", default: 10 },
  { key: "eps", unit: "mm", doc: "EPS, the lug polygon's overlap into the rod (params.scad line 21)", default: 0.01 },
];

const rad = (d: number): number => (d * Math.PI) / 180;

export function coincidenceLatchDerive(p: Values): Record<string, DerivedValue> {
  const T = p["T"]!;
  const C = p["C"]!;
  const crownTop = p["rodZ"]! + p["crownR"]!;
  const lpT = T;
  const zLug0 = p["lpZ"]! + lpT - p["rLatch"]!;
  const lugTot = p["lugH"]! + p["lugRamp"]!;
  const pinPlay = (p["notchW"]! - T) / 2;
  const ceilV = (u: number): number => -(u - (T / 2 - pinPlay)) * Math.tan(rad(p["rampA"]!));
  const eRest = -pinPlay;
  const cam = p["pinW"]! / 2 + p["lugP"]! + pinPlay - p["slotE"]!;
  const camLift = ceilV(eRest + T / 2) - ceilV(eRest + cam + T / 2);
  const crownTopAt = (zR: number, zC: number): number => {
    const za = p["rodZ"]! + zC;
    const th = Math.atan2(p["rodZ"]! + zR - za, 2 * C);
    return za + (C + p["crownOff"]!) * Math.sin(th) + p["crownR"]!;
  };
  // pin_state with lp 0 and latched false: the lug cams aside while it is inside the plate thickness.
  const lugBot = (zR: number, zC: number): number => {
    const free = crownTopAt(zR, zC);
    const rise = free - ceilV(eRest + T / 2) - crownTop;
    const bot = zLug0 + rise;
    const cammed = !(0 >= cam + 0.05) && bot + lugTot > p["lpZ"]! && bot < p["lpZ"]! + T;
    const e = cammed ? eRest + cam : eRest;
    return zLug0 + (free - ceilV(e + T / 2) - crownTop);
  };
  const S = p["stroke"]!;
  const top = p["lpZ"]! + T;
  const halfRise = crownTopAt(S, 0) - crownTop;
  const fullRise = crownTopAt(S, S) - crownTop;
  const margin = top - (lugBot(S, 0) + lugTot);
  const overshoot = lugBot(S, S) - top;
  return {
    cam: computed(cam, "mm", "(PIN_W/2 + LUG_P + PIN_PLAY) - SLOT_E"),
    camLift: computed(camLift, "mm", "ceil_v(E_REST + T/2) - ceil_v(E_REST + CAM + T/2)"),
    lugTot: computed(lugTot, "mm", "LUG_H + LUG_RAMP"),
    halfRise: computed(halfRise, "mm", "crown top rise with the row at STROKE and the column at 0"),
    fullRise: computed(fullRise, "mm", "crown top rise with row and column at STROKE"),
    margin: computed(margin, "mm", "plate top - half select lug top"),
    overshoot: computed(overshoot, "mm", "full select lug bottom - plate top"),
    identityLhs: computed(margin + overshoot, "mm", "margin + overshoot"),
    identityRhs: computed(fullRise - halfRise - camLift - lugTot, "mm", "(full rise - half rise) - cam lift - LUG_TOT"),
    identityStrokeHalf: computed(S / 2 - camLift - lugTot, "mm", "stroke/2 - cam lift - LUG_TOT, equal to the identity only where the half rise is stroke/2"),
  };
}
