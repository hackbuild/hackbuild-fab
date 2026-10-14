// geneva-external, KNURL's closed form (originals/knurl/files/knurl.html,
// K.layout lines 588 to 599 and K.geneva line 674, K.sim lines 675 to 685;
// lineage knurl.bench/knurl-8), D-096: rp = d sin(pi/n), Rs = d cos(pi/n),
// alpha = 180 - 360/n, dwell (n + 2)/(2n), index (n - 2)/(2n), and the
// wheel angle theta(phi) = atan2(rp sin phi, d - rp cos phi) within
// |phi| <= alpha/2, else sign(phi) 180/n. The seed's dwell (n - 2)/(2n)
// was the index fraction. TUMBLER's input, crank radius cr, maps through
// d = cr / sin(pi/n) (TUMBLER genevaGeo, line 282).

import type { DerivedValue } from "@hackbuild/spec";
import { computed, type InputParam, type Values } from "./common.js";

const D2R = Math.PI / 180;

export const GENEVA_PARAMS: readonly InputParam[] = [
  { key: "n", unit: "count", doc: "slots (KNURL rounds.R, 3)", default: 3 },
  { key: "d", unit: "mm", doc: "centre distance (KNURL rounds.d, 25)", default: 25 },
  { key: "phi", unit: "deg", doc: "drive pin angle from the line of centres", default: 0 },
  { key: "pinR", unit: "mm", doc: "drive pin radius, printed pin (KNURL rounds.pinR, 1.3)", default: 1.3 },
  { key: "clr", unit: "mm", doc: "pin in slot clearance per side (KNURL print.clr, 0.4)", default: 0.4 },
  { key: "flutes", unit: "count", doc: "count wheel flutes the pin advances over (KNURL count.N, 33)", default: 33 },
];

/** K.geneva: the wheel angle for a pin angle, deg, inside the drive window. */
export function genevaTheta(rp: number, d: number, phiDeg: number): number {
  const f = phiDeg * D2R;
  return Math.atan2(rp * Math.sin(f), d - rp * Math.cos(f)) / D2R;
}

export function genevaDerive(p: Values): Record<string, DerivedValue> {
  const n = p["n"]!;
  const d = p["d"]!;
  const rp = d * Math.sin(Math.PI / n);
  const Rs = d * Math.cos(Math.PI / n);
  const alpha = 180 - 360 / n;
  const half = alpha / 2;
  const phi = p["phi"]!;
  const theta = Math.abs(phi) <= half ? genevaTheta(rp, d, phi) : Math.sign(phi) * 180 / n;
  const delta = 360 / p["flutes"]!;
  const pinR = p["pinR"]!;
  return {
    rp: computed(rp, "mm", "rp = d sin(pi/n), the drive pin radius"),
    Rs: computed(Rs, "mm", "Rs = d cos(pi/n), the wheel radius"),
    slotLen: computed(rp + Rs - d, "mm", "rp + Rs - d"),
    alpha: computed(alpha, "deg", "alpha = 180 - 360/n, the drive window"),
    dwell: computed((n + 2) / (2 * n), "ratio", "(n + 2)/(2n) of a turn the wheel rests (D-096)"),
    index: computed((n - 2) / (2 * n), "ratio", "(n - 2)/(2n) of a turn the wheel moves"),
    indexAngle: computed(360 / n, "deg", "360/n per index"),
    wheelDia: computed(2 * Rs, "mm", "2 d cos(pi/n)"),
    slotWidth: computed(2 * (pinR + p["clr"]!), "mm", "2 (pinR + clr)"),
    carryOver: computed(alpha / delta, "counts", "alpha / (360/flutes), counts the pin spends in the slot"),
    pinSweep: computed(rp + pinR + 0.3 + 0.35, "mm", "rp + pinR + 0.3 + 0.35, the clearance KNURL opens around the pin orbit (line 657)"),
    theta: computed(theta, "deg", "atan2(rp sin phi, d - rp cos phi) within |phi| <= alpha/2, else sign(phi) 180/n"),
  };
}
