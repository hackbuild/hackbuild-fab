// DETENT beam steering: two 28BYJ-48 mirrors in half steps against a
// target plane in mm, ported from detent-plot.html (canonical lineage row
// detent.plot/beam; the copy designs/detent/legacy/detent-plot.html is the
// same file). Lines 474 to 475 (STEPS_PER_REV,
// DEG_PER_STEP) and 503 to 534 (stepToU, uToStep, mmToUV, uvToMm,
// mmToSteps, stepsToMm), with the page state S passed in as DetentRig and
// the solved homography passed in as DetentMap instead of S.hom and
// S.homInv. Operation order is kept so results are bit for bit the page's.
//
// Everything runs through (u, v) = (tan 2 thetaX, tan 2 thetaY); the ideal
// model is near linear in target mm there, which is what lets a four corner
// homography (calibrate.ts) absorb real error.

/** The rig numbers the map reads, from profile (detentRig in planners/detent-steps.ts). */
export interface DetentRig {
  /** Mirror to target distance, mm (page S.throw). */
  readonly throw: number;
  /** Mirror separation, mm (page S.sep). */
  readonly sep: number;
  /** Motor half steps per output revolution (profile 28byj48.halfStepsPerRev). */
  readonly halfStepsPerRev: number;
}

/** A solved projective map: h has the eight unknowns of solveH, inv the nine adjugate terms of invertH. */
export interface DetentMap {
  readonly hom: readonly number[];
  readonly homInv: readonly number[];
}

const RAD = Math.PI / 180;
const degPerStep = (r: DetentRig): number => 360 / r.halfStepsPerRev;

/** Half steps to u = tan(2 theta), line 505. */
export function stepToU(r: DetentRig, st: number): number {
  return Math.tan(2 * st * degPerStep(r) * RAD);
}

/** u back to half steps, unrounded, line 506. */
export function uToStep(r: DetentRig, u: number): number {
  return Math.atan(u) / 2 / RAD / degPerStep(r);
}

/** Target mm to (u, v), lines 508 to 516; through the homography when one is solved. */
export function mmToUV(r: DetentRig, x: number, y: number, map: DetentMap | null = null): [number, number] {
  if (map !== null) {
    const h = map.hom;
    let w = h[6]! * x + h[7]! * y + 1;
    if (Math.abs(w) < 1e-9) w = 1e-9;
    return [(h[0]! * x + h[1]! * y + h[2]!) / w, (h[3]! * x + h[4]! * y + h[5]!) / w];
  }
  const a = Math.atan2(x, r.throw + r.sep);
  return [Math.tan(a), (y * Math.cos(a)) / r.throw];
}

/** (u, v) to target mm, lines 517 to 526. */
export function uvToMm(r: DetentRig, u: number, v: number, map: DetentMap | null = null): [number, number] {
  if (map !== null) {
    const g = map.homInv;
    let w = g[6]! * u + g[7]! * v + g[8]!;
    if (Math.abs(w) < 1e-12) w = 1e-12;
    return [(g[0]! * u + g[1]! * v + g[2]!) / w, (g[3]! * u + g[4]! * v + g[5]!) / w];
  }
  const a = Math.atan(u);
  return [(r.throw + r.sep) * u, (r.throw * v) / Math.cos(a)];
}

/** Target mm to whole half steps, lines 527 to 530. */
export function mmToSteps(r: DetentRig, x: number, y: number, map: DetentMap | null = null): [number, number] {
  const [u, v] = mmToUV(r, x, y, map);
  return [Math.round(uToStep(r, u)), Math.round(uToStep(r, v))];
}

/** Half steps to target mm, lines 531 to 533. */
export function stepsToMm(r: DetentRig, sx: number, sy: number, map: DetentMap | null = null): [number, number] {
  return uvToMm(r, stepToU(r, sx), stepToU(r, sy), map);
}
