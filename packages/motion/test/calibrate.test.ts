// M07-T12: four-corner calibration behind one calibrate(). Expected values
// come from the legacy pages only: packages/motion/records/detent-cal.json
// (detent-plot.html solveH and invertH through the SOLVE handler body, the
// caltest.py corners and grid), packages/motion/records/washer-cal.json
// (laser-rig.html calibMap, fkCalib, fk and wallToAngles on the ideal-map
// corners, designs/washer/legacy/tools/extract-cal.mjs), and the M07
// Records table figures typed below.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { isThrownCommandError } from "@hackbuild/spec";
import {
  type BilinearCorners, type CalibrationField, type DetentMap, aspectTol, calibrate, detentRig, mmToSteps, stepsToMm, wallToAngles, washerRig,
} from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const profile = createProfileLookup(loadProfile());
const relClose = (got: number, want: number, rel = 1e-9): void => {
  expect(Math.abs(got - want), `${got} against ${want}`).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(want)));
};

const detentRec = (JSON.parse(read("packages/motion/records/detent-cal.json")) as { result: {
  params: { throw: number; sep: number; fieldW: number; fieldH: number; stepsPerRev: number; corners: [number, number][]; grid: [number, number, number] };
  homography: number[]; cornerWorstStepError: number; residualMm: number; roundTripWorstMm: number;
} }).result;
interface WasherCal {
  params: { wallW: number; wallH: number; grid: [number, number, number]; rollDeg: number };
  corners: BilinearCorners; residualMm: number; cornerWireError: number; roundTripMm: number; gridPoints: number; quadAspectRaw: number; quadAspect: number;
}
const washerRec = (JSON.parse(read("packages/motion/records/washer-cal.json")) as { result: { square: WasherCal; rolled: WasherCal } }).result;

const tol = aspectTol(profile);

describe("projective, DETENT caltest corners (computed)", () => {
  const rig = detentRig(profile);
  const R = detentRec;
  const field: CalibrationField = {
    w: profile.constant("detent.fieldW").value, h: profile.constant("detent.fieldH").value, gridStep: R.params.grid[2], aspectTol: tol,
  };
  const out = calibrate({ kind: "projective", rig, corners: R.params.corners }, field);

  test("the profile rig and field are the page defaults the record ran", () => {
    expect([rig.throw, rig.sep, rig.halfStepsPerRev, field.w, field.h]).toEqual([R.params.throw, R.params.sep, R.params.stepsPerRev, R.params.fieldW, R.params.fieldH]);
    expect([-field.w / 2, field.w / 2, field.gridStep]).toEqual(R.params.grid);
  });

  test("each corner maps back with 0 step error; worst round trip 0.2876 mm on the 10 mm grid", () => {
    expect(out.cornerWireError).toBe(0);
    expect(out.cornerWireError).toBe(R.cornerWorstStepError);
    expect(out.roundTripMm.toFixed(4)).toBe("0.2876");
    relClose(out.roundTripMm, R.roundTripWorstMm);
    expect(out.gridPoints).toBe(13 * 13);
    expect(out.residualMm).toBe(R.residualMm);
  });

  test("the homography equals the page's solve", () => {
    const map = out.map as DetentMap;
    expect(map.hom).toHaveLength(8);
    map.hom.forEach((v, i) => relClose(v, R.homography[i]!, 1e-12));
  });

  test("the solved map takes each field corner to its captured steps", () => {
    const map = out.map as DetentMap;
    const mm: [number, number][] = [[-60, 60], [60, 60], [60, -60], [-60, -60]];
    mm.forEach(([x, y], i) => expect(mmToSteps(rig, x, y, map)).toEqual(R.params.corners[i]));
    const back = stepsToMm(rig, R.params.corners[0]![0], R.params.corners[0]![1], map);
    expect(Math.hypot(back[0] + 60, back[1] - 60)).toBeLessThan(0.3);
  });

  test("the quad aspect is within a quarter of the field, so no warning; a quad half as tall warns", () => {
    expect(out.aspectWarning).toBe(false);
    expect(Math.abs(out.quadAspect - 1)).toBeLessThanOrEqual(tol);
    const squashed = R.params.corners.map(([x, y]) => [x, Math.round(y / 2)] as const);
    const s = calibrate({ kind: "projective", rig, corners: squashed }, field);
    expect(s.quadAspect).toBeGreaterThan(1 + tol);
    expect(s.aspectWarning).toBe(true);
  });

  test("collinear corners are E_UNSAT", () => {
    let code = "";
    try {
      calibrate({ kind: "projective", rig, corners: [[0, 0], [10, 0], [20, 0], [30, 0]] }, field);
    } catch (e) {
      if (isThrownCommandError(e)) code = e.hbf.code;
    }
    expect(code).toBe("E_UNSAT");
  });
});

// "square" aims at the target corners, "rolled" at them turned 5 deg about
// the centre; the rolled quad is no rectangle in angle space, so the Newton
// inverse needs more than one step (extract-cal.mjs).
describe.each([
  ["square", washerRec.square, "0.2515"],
  ["rolled", washerRec.rolled, "0.2592"],
] as const)("bilinear, WASHER ideal-map corners, %s (computed)", (_name, R, roundTrip) => {
  const rig = washerRig(profile);
  const field: CalibrationField = { w: rig.wallW, h: rig.wallH, gridStep: R.params.grid[2], aspectTol: tol };
  const out = calibrate({ kind: "bilinear", rig, corners: R.corners }, field);

  test("the fixture corners are the port's ideal map at the target corners, at 0.01 deg", () => {
    const hw = rig.wallW / 2, hh = rig.wallH / 2;
    const r2 = (x: number): number => +x.toFixed(2);
    const c = Math.cos((R.params.rollDeg * Math.PI) / 180), s = Math.sin((R.params.rollDeg * Math.PI) / 180);
    const at = { tl: [-hw, hh], tr: [hw, hh], br: [hw, -hh], bl: [-hw, -hh] } as const;
    for (const k of ["tl", "tr", "br", "bl"] as const) {
      const [x, y] = at[k];
      const a = wallToAngles(rig, x * c - y * s, x * s + y * c, null);
      expect({ pan: r2(a.pan), tilt: r2(a.tilt) }, k).toEqual(R.corners[k]);
    }
  });

  test("residual, corner error, round trip and aspect equal the legacy run; the round trip is recorded in the golden", () => {
    relClose(out.residualMm, R.residualMm);
    expect(out.cornerWireError).toBe(R.cornerWireError);
    relClose(out.roundTripMm, R.roundTripMm);
    expect(out.roundTripMm.toFixed(4)).toBe(roundTrip);
    expect(out.gridPoints).toBe(R.gridPoints);
    relClose(out.quadAspectRaw, R.quadAspectRaw);
    relClose(out.quadAspect, R.quadAspect);
    expect(out.aspectWarning).toBe(false);
  });

  test("a quad captured half as tall warns", () => {
    const c = R.corners;
    const mid = (c.tl.tilt + c.bl.tilt) / 2;
    const half = (t: number): number => mid + (t - mid) / 2;
    const squashed: BilinearCorners = {
      tl: { ...c.tl, tilt: half(c.tl.tilt) }, tr: { ...c.tr, tilt: half(c.tr.tilt) },
      bl: { ...c.bl, tilt: half(c.bl.tilt) }, br: { ...c.br, tilt: half(c.br.tilt) },
    };
    expect(calibrate({ kind: "bilinear", rig, corners: squashed }, field).aspectWarning).toBe(true);
  });

  test("a field other than the target is E_SCHEMA", () => {
    let code = "";
    try {
      calibrate({ kind: "bilinear", rig, corners: R.corners }, { ...field, w: 120 });
    } catch (e) {
      if (isThrownCommandError(e)) code = e.hbf.code;
    }
    expect(code).toBe("E_SCHEMA");
  });
});
