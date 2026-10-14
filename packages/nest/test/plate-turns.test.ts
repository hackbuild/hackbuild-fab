// plateLayouts on every quarter turn (M07 audit: the OGEE plates place no
// part at 270, so a wrong 270 offset survived every suite). The expected
// offset is computed here from the turned footprint corners, not from the
// rule in plates.ts: a counter-clockwise turn by r about the origin, then
// the move that puts the turned minimum corner on the placement's `at`.

import { describe, expect, test } from "vitest";
import type { NestResult, QuarterTurn } from "@hackbuild/spec";
import { plateLayouts, type PlatePart } from "@hackbuild/nest";

const W = 30, D = 12;
const part: PlatePart = { id: "bar", mesh: { positions: new Float64Array(0), triangles: new Uint32Array(0) }, w: W, d: D, h: 5 };
const turn = ([x, y]: readonly [number, number], r: QuarterTurn): [number, number] => {
  const a = (r * Math.PI) / 180, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  return [c * x - s * y, s * x + c * y];
};

describe.each([0, 90, 180, 270] as const)("rot %i", (rot) => {
  test("the turned part's minimum corner lands on the placement's at", () => {
    const at: [number, number] = [40, 25];
    const result = { sheets: 1, placements: [{ id: "bar", copy: 0, sheet: 0, at, rot }] } as unknown as NestResult;
    const inst = plateLayouts(result, [part])[0]!.instances["bar"]![0]!;
    expect(inst.rotZ).toBe(rot);
    const corners = ([[0, 0], [W, 0], [W, D], [0, D]] as const).map((p) => turn(p, rot));
    const min: [number, number] = [Math.min(...corners.map((p) => p[0])), Math.min(...corners.map((p) => p[1]))];
    expect([inst.at[0] + min[0], inst.at[1] + min[1]]).toEqual(at);
  });
});
