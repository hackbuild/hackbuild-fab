// M00-T03 step 4: the earcut port gives the same triangles as earcut 2.2.4
// (KNUCKLE vendors 2.2.4 byte-identical to the npm build), and the wrapper
// reads holes from their position, keeps original vertex indices, and
// survives rows of holes with identical Y.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { Ring, Vec2 } from "@hackbuild/spec";
import { earcut, ringArea2, triangulate, type Triangulation } from "../src/index.js";

const require = createRequire(import.meta.url);
const reference = require("earcut") as (data: ArrayLike<number>, holes?: number[] | null, dim?: number) => number[];

interface FixtureFile {
  readonly fixtures: readonly { readonly name: string; readonly a: number[][][][]; readonly b: number[][][][]; readonly triangulations: readonly { readonly holes: number[]; readonly indices: number[] }[] }[];
}
const file = JSON.parse(readFileSync(new URL("./fixtures/boss-booleans.json", import.meta.url), "utf8")) as FixtureFile;

function flatten(rings: readonly (readonly (readonly number[])[])[]): { flat: number[]; holes: number[] } {
  const flat: number[] = [];
  const holes: number[] = [];
  rings.forEach((ring, k) => {
    if (k > 0) holes.push(flat.length / 2);
    for (const p of ring) flat.push(p[0]!, p[1]!);
  });
  return { flat, holes };
}

const circle = (cx: number, cy: number, r: number, n: number, rot = 0): Ring =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos(rot + (2 * Math.PI * i) / n), cy + r * Math.sin(rot + (2 * Math.PI * i) / n)] as Vec2);
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function capArea(t: Triangulation): number {
  let s = 0;
  for (let i = 0; i < t.triangles.length; i += 3) {
    const [ax, ay] = t.points[t.triangles[i]!]!;
    const [bx, by] = t.points[t.triangles[i + 1]!]!;
    const [cx, cy] = t.points[t.triangles[i + 2]!]!;
    const a2 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    expect(a2).toBeGreaterThanOrEqual(0);
    s += a2 / 2;
  }
  return s;
}

describe("earcut port matches earcut 2.2.4", () => {
  test("BOSS fixture polygons give the indices the legacy script recorded", () => {
    let n = 0;
    for (const f of file.fixtures) {
      const polys = [...f.a, ...f.b];
      polys.forEach((poly, i) => {
        const { flat, holes } = flatten(poly);
        const rec = f.triangulations[i]!;
        expect(holes).toEqual(rec.holes);
        expect(earcut(flat, holes.length > 0 ? holes : null, 2)).toEqual(rec.indices);
        n++;
      });
    }
    expect(n).toBeGreaterThan(0);
  });

  test("hashed path (over 80 vertices) and hole bridging agree with the reference", () => {
    const outer = circle(0, 0, 30, 120);
    const holes = [circle(-12, 0, 4, 40), circle(12, 0, 4, 40), rect(-3, 10, 3, 14), rect(-3, -14, 3, -10)];
    const { flat, holes: hi } = flatten([outer, ...holes.map((h) => [...h].reverse())]);
    expect(earcut(flat, hi, 2)).toEqual(reference(flat, hi, 2));
  });

  test("random star polygons with holes agree with the reference", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 5, max: 20, noNaN: true }), { minLength: 3, maxLength: 120 }),
        fc.array(fc.tuple(fc.double({ min: -2, max: 2, noNaN: true }), fc.double({ min: -2, max: 2, noNaN: true })), { maxLength: 3 }),
        (radii, centres) => {
          const outer = radii.map((r, i) => [r * Math.cos((2 * Math.PI * i) / radii.length), r * Math.sin((2 * Math.PI * i) / radii.length)] as Vec2);
          const holes = centres.map(([x, y], k) => circle(x + (k - 1) * 1.2, y, 0.5, 6));
          const { flat, holes: hi } = flatten([outer, ...holes]);
          expect(earcut(flat, hi.length > 0 ? hi : null, 2)).toEqual(reference(flat, hi.length > 0 ? hi : null, 2));
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("triangulate wrapper", () => {
  test("a hole drawn the same way round as its outer ring still cuts", () => {
    const outer = rect(0, 0, 20, 10);
    const hole = rect(5, 3, 15, 7);
    expect(ringArea2(hole)).toBeGreaterThan(0);
    const t = triangulate({ outer, holes: [hole] });
    expect(t.complete).toBe(true);
    expect(t.degenerate).toBe(0);
    expect(capArea(t)).toBeCloseTo(200 - 40, 9);
  });

  test("indices point at the original vertices; bridge vertices never appear", () => {
    const t = triangulate({ outer: circle(0, 0, 10, 32), holes: [circle(0, 0, 4, 16)] });
    expect(t.points.length).toBe(48);
    expect(Math.max(...t.triangles)).toBeLessThan(48);
    expect(t.triangles.length / 3).toBe(48 + 2 - 2);
    expect(t.ringStarts).toEqual([0, 32]);
  });

  test("a row of holes with identical Y triangulates complete with the cap area exact (computed)", () => {
    const outer = rect(0, 0, 100, 10);
    const holes = Array.from({ length: 12 }, (_, i) => rect(4 + i * 8, 4, 8 + i * 8, 6));
    const t = triangulate({ outer, holes });
    expect(t.complete).toBe(true);
    expect(t.degenerate).toBe(0);
    expect(capArea(t)).toBeCloseTo(1000 - 12 * 8, 9);
  });

  test("collinear vertices on a wall are kept: a retry jitters them off the line", () => {
    const outer: Ring = [[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]];
    const t = triangulate({ outer });
    expect(t.complete).toBe(true);
    expect(new Set(t.triangles).size).toBe(5);
  });

  test("the same input gives the same triangles every time", () => {
    const input = { outer: circle(0, 0, 10, 64), holes: [circle(3, 0, 1, 12), circle(-3, 0, 1, 12)] };
    expect(Array.from(triangulate(input).triangles)).toEqual(Array.from(triangulate(input).triangles));
  });
});
