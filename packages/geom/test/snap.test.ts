// D-054 dyadic snap: q(v) = round(v * 1024) / 1024. Values on the grid are
// exact in float64 and survive a float32 round trip up to 2^24 / 1024 =
// 16384 mm (computed).

import fc from "fast-check";
import { beforeAll, describe, expect, test } from "vitest";
import * as geom from "../src/index.js";
import { FLOAT32_EXACT_LIMIT, GRID, isSnapped, loadGeom, q, type Geom } from "../src/index.js";

let g: Geom;
beforeAll(async () => {
  g = await loadGeom();
});

describe("q (D-054)", () => {
  test("q(0.1) === 0.099609375", () => {
    expect(q(0.1)).toBe(0.099609375);
  });

  test("grid step is 1/1024 mm and the float32 limit is 16384 mm (computed)", () => {
    expect(GRID).toBe(0.0009765625);
    expect(FLOAT32_EXACT_LIMIT).toBe(16384);
  });

  test("snapped values survive a Float32Array round trip for |v| up to 16384", () => {
    fc.assert(
      fc.property(fc.double({ min: -16384, max: 16384, noNaN: true }), (v) => {
        const s = q(v);
        expect(Math.abs(s)).toBeLessThanOrEqual(16384);
        expect(new Float32Array([s])[0]).toBe(s);
      }),
      { numRuns: 20000 },
    );
    for (const s of [16384, -16384, 16383.9990234375, -16383.9990234375, GRID, -GRID]) {
      expect(new Float32Array([s])[0]).toBe(s);
    }
  });

  test("q is idempotent and moves a value by at most half a grid step", () => {
    fc.assert(
      fc.property(fc.double({ min: -1e5, max: 1e5, noNaN: true }), (v) => {
        const s = q(v);
        expect(q(s)).toBe(s);
        expect(isSnapped(s)).toBe(true);
        expect(Math.abs(s - v)).toBeLessThanOrEqual(GRID / 2);
      }),
    );
  });

  test("sums and differences of snapped values stay on the grid", () => {
    fc.assert(
      fc.property(fc.double({ min: -1000, max: 1000, noNaN: true }), fc.double({ min: -1000, max: 1000, noNaN: true }), (a, b) => {
        expect(isSnapped(q(a) + q(b))).toBe(true);
        expect(isSnapped(q(a) - q(b))).toBe(true);
      }),
    );
  });

  test("negative zero snaps to zero", () => {
    expect(Object.is(q(-0.0001), 0)).toBe(true);
  });

  // One layer grid (D-208): profile layerTop / layerIndex own the unsnapped
  // tops, and the mesh kernel alone applies q to them (pinned by M-S-T03 in
  // packages/mesh/test/skeleton.test.ts). geom carries no second copy.
  test("geom exports no layer-grid function", () => {
    expect(Object.keys(geom).filter((k) => /layer/i.test(k))).toEqual([]);
  });

  test("CrossSection keeps snapped coordinates exactly through entry and emit", () => {
    const ring = [[0, 0], [0.1, 0], [0.1, 0.3], [0, 0.3]] as const;
    const rings = g.fromRings([ring]).toRings({ snap: false });
    for (const r of rings) for (const [x, y] of r) expect(isSnapped(x) && isSnapped(y)).toBe(true);
    expect(g.fromRings([ring]).area()).toBe(q(0.1) * q(0.3));
  });
});
