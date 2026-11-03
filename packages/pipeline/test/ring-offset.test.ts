// Author.ring.offset (spec/build.ts) runs through geom's CrossSection. The
// round-join area of a square offset outward is s^2 + 4 s d + pi d^2
// (computed); the polygonal arc sits inside the true arc, so the test
// allows 1 percent of the corner term below and none above.

import { beforeAll, describe, expect, test } from "vitest";
import type { Ring } from "@hackbuild/spec";
import { loadGeom, ringArea2 } from "@hackbuild/geom";
import { liveCount } from "@hackbuild/mesh";
import { makeAuthor } from "@hackbuild/pipeline";
import { chase } from "../../../designs/bail/chase.js";

const area = (rings: readonly Ring[]): number => rings.reduce((a, r) => a + ringArea2(r) / 2, 0);
const square = (s: number): Ring => [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]];

let offset: (rings: readonly Ring[], d: number, join?: "round" | "miter") => readonly Ring[];

beforeAll(async () => {
  const geom = await loadGeom();
  const k = makeAuthor(chase, {} as never, [], [], geom);
  offset = k.ring.offset;
});

describe("k.ring.offset", () => {
  test("outward round offset of a square", () => {
    const s = 20, d = 2;
    const out = offset([square(s)], d);
    expect(out.length).toBe(1);
    expect(ringArea2(out[0] as Ring)).toBeGreaterThan(0);
    const exact = s * s + 4 * s * d + Math.PI * d * d;
    const corner = (Math.PI - 4 + 4) * d * d;
    expect(area(out)).toBeLessThanOrEqual(exact + 1e-6);
    expect(area(out)).toBeGreaterThan(exact - 0.01 * corner - 0.01);
  });

  test("miter join keeps square corners", () => {
    expect(area(offset([square(20)], 2, "miter"))).toBeCloseTo(24 * 24, 2);
  });

  test("inward offset shrinks to (s - 2d)^2", () => {
    expect(area(offset([square(20)], -2))).toBeCloseTo(16 * 16, 2);
  });

  test("a hole stays clockwise and grows inward when the outer grows", () => {
    const hole = [...square(6)].reverse();
    const out = offset([square(20), hole], 1);
    expect(out.length).toBe(2);
    expect(out.filter((r) => ringArea2(r) < 0).length).toBe(1);
    expect(area(out)).toBeGreaterThan(20 * 20 - 36);
  });

  test("an offset that erases the ring returns []", () => {
    expect(offset([square(4)], -3)).toEqual([]);
  });

  test("output is identical over two runs", () => {
    const a = JSON.stringify(offset([square(20)], 1.5));
    const b = JSON.stringify(offset([square(20)], 1.5));
    expect(a).toBe(b);
  });

  test("live wasm count ends at zero", () => {
    const before = liveCount();
    for (let i = 0; i < 20; i++) offset([square(20), [...square(6)].reverse()], 0.5 + i / 10);
    expect(liveCount()).toBe(before);
    expect(before).toBe(0);
  });
});
