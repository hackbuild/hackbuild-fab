// Four-corner calibration for both rigs behind one calibrate(corners,
// field) returning a CalibrationReadout (D-139).
//
// projective (DETENT): solveH, the 8 x 8 Gauss-Jordan with partial
// pivoting, and invertH, the adjugate inverse (detent-plot.html lines 537
// to 565, canonical row detent.plot/beam), solved from the four captured
// step positions in capture order TL TR BR BL through the SOLVE handler
// body (lines 1883 to 1915): the residual pushes each corner back through
// the solved map and compares it with the captured steps in mm, and the
// quad aspect is the mean horizontal tangent span over the mean vertical.
//
// bilinear (WASHER): the captured corner aims are the map (calibMap, with
// fkCalib its Newton inverse, kinematics/washer.ts). The residual is the
// same corner push-back through fk; the quad aspect is DETENT's rule on the
// corners placed by the ideal map, since the page states no aspect check
// of its own.
//
// Both report the worst round trip over the field grid through the wire
// quantisation: whole half steps for DETENT (the caltest.py check), whole
// pulse microseconds for WASHER. The aspect warning fires when the quad
// aspect is off the field aspect by more than the profile fraction (DETENT
// line 1911).

import { commandError, type CalibrationReadout, type ProfileLookup } from "@hackbuild/spec";
import { type DetentMap, type DetentRig, mmToSteps, stepToU, stepsToMm } from "./kinematics/detent.js";
import { type BilinearCorners, type ServoAim, type WasherRig, degToUs, fk, usToDeg, wallToAngles } from "./kinematics/washer.js";

/** Solve the 8 unknowns of a projective map from four (x, y, u, v), lines 537 to 558; null when the corners are collinear. */
export function solveH(pts: readonly (readonly [number, number, number, number])[]): number[] | null {
  const A: number[][] = [], b: number[] = [];
  for (const [x, y, u, v] of pts) {
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[piv]![c]!)) piv = r;
    if (Math.abs(A[piv]![c]!) < 1e-14) return null;
    [A[c], A[piv]] = [A[piv]!, A[c]!];
    [b[c], b[piv]] = [b[piv]!, b[c]!];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r]![c]! / A[c]![c]!;
      if (!f) continue;
      for (let k = c; k < n; k++) A[r]![k]! -= f * A[c]![k]!;
      b[r]! -= f * b[c]!;
    }
  }
  return b.map((v, i) => v / A[i]![i]!);
}

/** The adjugate of the 3 x 3 homography with h33 = 1, lines 559 to 565. */
export function invertH(h: readonly number[]): number[] {
  const [a, bb, c, d, e, f, g, hh] = h as [number, number, number, number, number, number, number, number];
  const i = 1;
  return [
    e * i - f * hh, -(bb * i - c * hh), bb * f - c * e,
    -(d * i - f * g), a * i - c * g, -(a * f - c * d),
    d * hh - e * g, -(a * hh - bb * g), a * e - bb * d,
  ];
}

/** The target field the corners frame, mm, and the readout settings. */
export interface CalibrationField {
  /** Field width and height, mm. */
  readonly w: number;
  readonly h: number;
  /** Round trip grid spacing, mm; the grid is every multiple of it inside the field. */
  readonly gridStep: number;
  /** Fraction the quad aspect may be off the field aspect before the warning fires. */
  readonly aspectTol: number;
}

export type CalibrationInput =
  | {
      readonly kind: "projective";
      readonly rig: DetentRig;
      /** Captured steps, TL TR BR BL (the page's S.corners order). */
      readonly corners: readonly (readonly [number, number])[];
    }
  | {
      readonly kind: "bilinear";
      readonly rig: WasherRig;
      readonly corners: BilinearCorners;
    };

export interface CalibrationResult extends CalibrationReadout {
  /** Worst corner error on the wire: half steps (projective) or pulse us (bilinear). */
  readonly cornerWireError: number;
  /** The quad aspect alone, width over height. */
  readonly quadAspectRaw: number;
  /** Field width over height. */
  readonly fieldAspect: number;
  readonly aspectWarning: boolean;
  /** Grid points the round trip visited. */
  readonly gridPoints: number;
  /** The solved projective map, or the corner map. */
  readonly map: DetentMap | BilinearCorners;
}

/** Field mm of corner i in capture order TL TR BR BL (cornerMm, lines 567 to 570). */
export function cornerMm(field: Pick<CalibrationField, "w" | "h">, i: number): [number, number] {
  const w = field.w / 2, h = field.h / 2;
  return ([[-w, h], [w, h], [w, -h], [-w, -h]] as [number, number][])[i]!;
}

/** The aspect warning fraction from profile. */
export const aspectTol = (profile: Pick<ProfileLookup, "constant">): number => profile.constant("calibrate.aspectTol").value;

function* grid(field: CalibrationField): Generator<[number, number]> {
  const kx = Math.floor(field.w / 2 / field.gridStep + 1e-9), ky = Math.floor(field.h / 2 / field.gridStep + 1e-9);
  for (let i = -kx; i <= kx; i++) for (let j = -ky; j <= ky; j++) yield [i * field.gridStep, j * field.gridStep];
}

function aspect(uw: number, vh: number, field: CalibrationField): { quadAspectRaw: number; fieldAspect: number; quadAspect: number; aspectWarning: boolean } {
  const quadAspectRaw = vh > 1e-9 ? uw / vh : 0;
  const fieldAspect = field.w / field.h;
  return {
    quadAspectRaw, fieldAspect, quadAspect: quadAspectRaw / fieldAspect,
    aspectWarning: quadAspectRaw !== 0 && Math.abs(quadAspectRaw / fieldAspect - 1) > field.aspectTol,
  };
}

function projective(rig: DetentRig, corners: readonly (readonly [number, number])[], field: CalibrationField): CalibrationResult {
  if (corners.length !== 4) {
    throw commandError({ code: "E_SCHEMA", path: "/corners", got: String(corners.length), expected: "four captured corners, TL TR BR BL", hint: "capture all four corners first", record: "motion-latch" });
  }
  const pts = corners.map((c, i) => {
    const m = cornerMm(field, i);
    return [m[0], m[1], stepToU(rig, c[0]), stepToU(rig, c[1])] as const;
  });
  const h = solveH(pts);
  if (h === null) {
    throw commandError({ code: "E_UNSAT", path: "/corners", got: JSON.stringify(corners), expected: "four corners, no three collinear", hint: "corners are collinear or degenerate, recapture them", record: "motion-latch" });
  }
  const map: DetentMap = { hom: h, homInv: invertH(h) };
  let residualMm = 0, cornerWireError = 0;
  for (let i = 0; i < 4; i++) {
    const m = cornerMm(field, i), got = mmToSteps(rig, m[0], m[1], map), want = corners[i]!;
    const a = stepsToMm(rig, got[0], got[1], map), b = stepsToMm(rig, want[0], want[1], map);
    residualMm = Math.max(residualMm, Math.hypot(a[0] - b[0], a[1] - b[1]));
    cornerWireError = Math.max(cornerWireError, Math.abs(got[0] - want[0]), Math.abs(got[1] - want[1]));
  }
  const C = corners.map((c) => [stepToU(rig, c[0]), stepToU(rig, c[1])] as const);
  const uw = (Math.abs(C[1]![0] - C[0]![0]) + Math.abs(C[2]![0] - C[3]![0])) / 2;
  const vh = (Math.abs(C[0]![1] - C[3]![1]) + Math.abs(C[1]![1] - C[2]![1])) / 2;
  let roundTripMm = 0, gridPoints = 0;
  for (const [x, y] of grid(field)) {
    const s = mmToSteps(rig, x, y, map), m = stepsToMm(rig, s[0], s[1], map);
    roundTripMm = Math.max(roundTripMm, Math.hypot(m[0] - x, m[1] - y));
    gridPoints++;
  }
  return { kind: "projective", residualMm, roundTripMm, cornerWireError, gridPoints, map, ...aspect(uw, vh, field) };
}

function bilinear(rig: WasherRig, c: BilinearCorners, field: CalibrationField): CalibrationResult {
  if (field.w !== rig.wallW || field.h !== rig.wallH) {
    throw commandError({ code: "E_SCHEMA", path: "/field", got: `${field.w} x ${field.h}`, expected: `${rig.wallW} x ${rig.wallH}, the target the corners frame`, hint: "the WASHER corner map spans the whole target; pass the rig's wallW and wallH", record: "motion-latch" });
  }
  const captured: ServoAim[] = [c.tl, c.tr, c.br, c.bl];
  let residualMm = 0, cornerWireError = 0;
  const ideal: { wx: number; wy: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const m = cornerMm(field, i), got = wallToAngles(rig, m[0], m[1], c), want = captured[i]!;
    const a = fk(rig, got.pan, got.tilt, c), b = fk(rig, want.pan, want.tilt, c);
    residualMm = Math.max(residualMm, Math.hypot(a.wx - b.wx, a.wy - b.wy));
    cornerWireError = Math.max(cornerWireError, Math.abs(degToUs(rig, got.pan) - degToUs(rig, want.pan)), Math.abs(degToUs(rig, got.tilt) - degToUs(rig, want.tilt)));
    ideal.push(fk(rig, want.pan, want.tilt, null));
  }
  const uw = (Math.abs(ideal[1]!.wx - ideal[0]!.wx) + Math.abs(ideal[2]!.wx - ideal[3]!.wx)) / 2;
  const vh = (Math.abs(ideal[0]!.wy - ideal[3]!.wy) + Math.abs(ideal[1]!.wy - ideal[2]!.wy)) / 2;
  let roundTripMm = 0, gridPoints = 0;
  for (const [x, y] of grid(field)) {
    const g = wallToAngles(rig, x, y, c);
    const w = fk(rig, usToDeg(rig, degToUs(rig, g.pan)), usToDeg(rig, degToUs(rig, g.tilt)), c);
    roundTripMm = Math.max(roundTripMm, Math.hypot(w.wx - x, w.wy - y));
    gridPoints++;
  }
  return { kind: "bilinear", residualMm, roundTripMm, cornerWireError, gridPoints, map: c, ...aspect(uw, vh, field) };
}

/** Solve a four-corner calibration and read out its residual, round trip and aspect. */
export function calibrate(input: CalibrationInput, field: CalibrationField): CalibrationResult {
  return input.kind === "projective" ? projective(input.rig, input.corners, field) : bilinear(input.rig, input.corners, field);
}
