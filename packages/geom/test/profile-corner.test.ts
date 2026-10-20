// R1-engine-07: rounded and chamfered corners of an (r, z) revolve profile.
// The arc is held to its circle as a geometric relation (every point at r
// from the centre tangent to both legs) and the profile area to the closed
// form: a 10 x 10 square loses r^2 (1 - pi/4) at a rounded corner, less the
// n chord segments n r^2 / 2 (s - sin s), s = pi / (2 n) (computed), and
// c^2 / 2 at a chamfer. The OGEE16 hub root cone (printed.scad lines 318 to
// 321, d1 HUB_D + 3 to d2 HUB_D over 1.5) is the chamfer case.

import { describe, expect, test } from "vitest";
import type { Vec2 } from "@hackbuild/spec";
import { chamferCorner, ringArea2, roundCorner } from "../src/index.js";

const SQ: Vec2[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
const area = (p: readonly Vec2[]): number => ringArea2(p) / 2;
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { hbf?: { code: string } }).hbf?.code;
  }
  return undefined;
};

describe("roundCorner", () => {
  test("a convex corner of r 1 in 32 steps: profile area with the arc within 0.01 percent of analytic, every point on the tangent circle (computed)", () => {
    const r = 1, n = 32;
    const out = roundCorner(SQ, 2, r, n);
    expect(out.length).toBe(SQ.length - 1 + n + 1);
    const arc = out.slice(2, 2 + n + 1);
    expect(arc[0]).toEqual([10, 9]);
    expect(arc[n]).toEqual([9, 10]);
    for (const [x, y] of arc) expect(Math.abs(Math.hypot(x - 9, y - 9) - r)).toBeLessThan(1e-12);
    const exact = 100 - r * r * (1 - Math.PI / 4);
    const s = Math.PI / (2 * n);
    const chords = (n * r * r * (s - Math.sin(s))) / 2;
    expect(Math.abs(area(out) - (exact - chords))).toBeLessThan(1e-12);
    const rel = (area(out) - exact) / exact;
    console.log(`round r 1, n 32: profile area ${area(out).toFixed(8)} mm2, analytic ${exact.toFixed(8)} mm2, error ${(rel * 100).toFixed(5)} percent (computed)`);
    expect(Math.abs(rel)).toBeLessThan(0.0001);
  });

  test("a concave root corner (boss wall on a plate top) bends the arc into the solid's air: points at r from the centre outside the profile", () => {
    // plate top at z 4 out to r 9, boss wall r 5 up to z 14: corner (5, 4) is index 3
    const P: Vec2[] = [[0, 2], [9, 2], [9, 4], [5, 4], [5, 14], [0, 14]];
    const out = roundCorner(P, 3, 2, 16);
    const arc = out.slice(3, 3 + 17);
    expect(arc[0]).toEqual([7, 4]);
    expect(arc[16]).toEqual([5, 6]);
    for (const [x, y] of arc) {
      expect(Math.abs(Math.hypot(x - 7, y - 6) - 2)).toBeLessThan(1e-12);
      expect(x).toBeLessThanOrEqual(7 + 1e-12);
      expect(y).toBeLessThanOrEqual(6 + 1e-12);
    }
    // the fillet adds r^2 (1 - pi/4) = 4 - pi of profile area, plus the 16 chord segments on the air side (computed)
    const st = Math.PI / 32;
    expect(Math.abs(area(out) - area(P) - (4 - Math.PI + (16 * 4 * (st - Math.sin(st))) / 2))).toBeLessThan(1e-12);
  });

  test("refuses a radius whose setback passes a leg (E_UNSAT) and a step count off the D-175 table (E_SCHEMA)", () => {
    expect(code(() => roundCorner(SQ, 2, 11, 8))).toBe("E_UNSAT");
    expect(code(() => roundCorner(SQ, 2, 1, 65))).toBe("E_SCHEMA");
    expect(code(() => roundCorner(SQ, 2, 1, 2.5))).toBe("E_SCHEMA");
    expect(code(() => roundCorner([[0, 0], [5, 0], [10, 0], [0, 10]], 1, 1, 8))).toBe("E_SCHEMA");
  });
});

describe("chamferCorner", () => {
  test("a 45 deg root cone 1.5 by 1.5 as OGEE16 knob_hub cuts c^2 / 2 (computed)", () => {
    const c = 1.5;
    const out = chamferCorner(SQ, 2, c);
    expect(out.slice(2, 4)).toEqual([[10, 10 - c], [10 - c, 10]]);
    expect(Math.abs(area(out) - (100 - (c * c) / 2))).toBeLessThan(1e-12);
    expect(code(() => chamferCorner(SQ, 2, 10))).toBe("E_UNSAT");
  });
});
