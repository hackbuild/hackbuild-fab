// M00-T03 steps 5 and 6: the sliver report and the two CHK-3MF-04 insets,
// with every distance read through constant() (M00-T02 step 9 rows).

import { beforeAll, describe, expect, test } from "vitest";
import type { Ring, Vec2 } from "@hackbuild/spec";
import { insetCoincident, insetPinch, loadGeom, slivers, type Geom } from "../src/index.js";
import { profileStub } from "./fixtures/constants.js";

let g: Geom;
beforeAll(async () => {
  g = await loadGeom();
});

const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe("insets (D-070)", () => {
  test("insetCoincident moves every edge in by 0.001 mm along its normal (computed)", () => {
    const tri = g.fromRings([[[0, 0], [20, 0], [10, 15]]]);
    const inner = insetCoincident(tri, profileStub);
    // a Miter inset of a convex polygon loses P d - d^2 sum cot(theta_i / 2) (computed)
    const d = 0.001;
    const perimeter = 20 + 2 * Math.hypot(10, 15);
    const base = Math.atan2(15, 10);
    const cot = (t: number): number => 1 / Math.tan(t / 2);
    const lost = perimeter * d - d * d * (2 * cot(base) + cot(Math.PI - 2 * base));
    expect(Math.abs(tri.area() - inner.area() - lost)).toBeLessThan(1e-6);
    const b = inner.bounds()!;
    expect(b.min[1]).toBeCloseTo(0.001, 7);
  });

  test("an edge-normal inset of a spiral arm stays off the wall a homothety would push it into", () => {
    // an off-centre arm: a centroid homothety moves its far edge outward relative to a wall at x = 30
    const arm = g.fromRings([rect(20, -1, 30, 1)]);
    const inner = insetPinch(arm, profileStub);
    const b = inner.bounds()!;
    expect(b.max[0]).toBeCloseTo(30 - 0.02, 7);
    expect(b.min[0]).toBeCloseTo(20 + 0.02, 7);
  });

  test("a constant in the wrong unit is refused with E_SCHEMA", () => {
    const bad = { constant: () => ({ id: "3mf.pinchInset", value: 20, unit: "um", provenance: { tier: "inferred" as const, method: "derived" as const, date: "2026-10-04", source: "test" } }) };
    expect(() => insetPinch(g.fromRings([rect(0, 0, 1, 1)]), bad)).toThrowError(/positive length in mm/);
  });
});

describe("sliver report (geom.sliverMin.n04, 0.6 mm inferred)", () => {
  test("a 0.4 mm strip on a square is reported with its location", () => {
    const body = g.fromRings([rect(0, 0, 10, 10), rect(10, 4.8, 20, 5.2)]);
    const found = slivers(body, profileStub);
    expect(found.length).toBe(1);
    const s = found[0]!;
    expect(s.legal).toBe(0.6);
    expect(s.constraint).toBe("geom.sliverMin.n04");
    expect(s.at[0]).toBeGreaterThan(10);
    expect(s.at[1]).toBeCloseTo(5, 3);
    expect(s.area).toBeCloseTo(10 * 0.4, 2);
  });

  test("sharp corners alone are no sliver", () => {
    expect(slivers(g.fromRings([[[0, 0], [20, 0], [10, 15]]]), profileStub)).toEqual([]);
    expect(slivers(g.fromRings([rect(0, 0, 10, 10)]), profileStub)).toEqual([]);
  });

  test("a ring with a 0.4 mm wall is all sliver; a 0.8 mm wall is none", () => {
    const ring = (w: number): Ring[] => [rect(0, 0, 10, 10), [...rect(w, w, 10 - w, 10 - w)].reverse() as Vec2[]];
    const wall = g.fromRings(ring(0.4));
    const thin = slivers(wall, profileStub);
    expect(thin.length).toBeGreaterThan(0);
    expect(thin.reduce((s, x) => s + x.area, 0)).toBeCloseTo(wall.area(), 6);
    expect(slivers(g.fromRings(ring(0.8)), profileStub)).toEqual([]);
  });
});
