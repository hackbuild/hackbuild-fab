// CHK-SHP-03 on a window through a wall measures the flat roof's width, the
// bridge the slicer prints over the opening, not the opening's short side.

import { describe, expect, test } from "vitest";
import type { Ring, WindowFeature } from "@hackbuild/spec";
import { roofSpan } from "../src/defs/shp/CHK-SHP-03.js";

const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const win = (outline: Ring, normal: [number, number, number], u: [number, number, number]): WindowFeature =>
  ({ id: "window.w", kind: "window", roof: "flat", outline, face: { origin: [0, 0, 0], normal, u } }) as WindowFeature;

describe("CHK-SHP-03 roof span", () => {
  test("a 4.5 wide, 2.88 tall channel in a vertical face bridges 4.5 mm, whichever way v points", () => {
    // normal +y, u +x: v = -z, so face y -4.09 to -1.21 is part z 1.21 to 4.09
    expect(roofSpan(win(rect(-2.25, -4.09, 2.25, -1.21), [0, 1, 0], [1, 0, 0]))).toBeCloseTo(4.5, 12);
    // normal -y, u +x: v = +z
    expect(roofSpan(win(rect(-2.25, 1.21, 2.25, 4.09), [0, -1, 0], [1, 0, 0]))).toBeCloseTo(4.5, 12);
  });

  test("a stepped roof takes the run at the highest z", () => {
    // v = +z: a 6 wide opening whose top 2 mm is 2 wide
    const stepped: Ring = [[-3, 0], [3, 0], [3, 2], [1, 2], [1, 4], [-1, 4], [-1, 2], [-3, 2]];
    expect(roofSpan(win(stepped, [0, -1, 0], [1, 0, 0]))).toBeCloseTo(2, 12);
  });

  test("a window in a horizontal face has no roof run, so the plan span is used", () => {
    expect(roofSpan(win(rect(0, 0, 4, 2), [0, 0, 1], [1, 0, 0]))).toBeNull();
  });
});
