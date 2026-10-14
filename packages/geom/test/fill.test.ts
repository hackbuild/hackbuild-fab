// M03-T04 step 5: even-odd fill against SPRUE fromPolygon as shipped, SVG
// path flattening against the hack.build mark in the committed COLLAR copy,
// and the node vector surface.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Ring } from "@hackbuild/spec";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { fillPolygonEvenOdd, flattenSvgPath, vectorSurface, type RasterGrid } from "../src/index.js";
import { FROM_POLYGON_FIRST_LINE, FROM_POLYGON_LINES, SPRUE_PATH } from "./fixtures/sprue-from-polygon.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const count = (m: Uint8Array): number => m.reduce((a, b) => a + b, 0);
const square = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

type Sprue = { fromPolygon(w: number, h: number, ppm: number, poly: Ring): { d: Uint8Array } };
function sprue(): Sprue {
  const S = { mask: (w: number, h: number) => ({ w, h, d: new Uint8Array(w * h) }) } as Record<string, unknown>;
  new Function("S", FROM_POLYGON_LINES.join("\n"))(S);
  return S as unknown as Sprue;
}

describe("fillPolygonEvenOdd", () => {
  test("a unit square at 10 cells per mm fills 100 cells", () => {
    const g: RasterGrid = { w: 40, h: 40, res: 10 };
    expect(count(fillPolygonEvenOdd(g, [square(0, 0, 1, 1)], "bottom"))).toBe(100);
    expect(count(fillPolygonEvenOdd(g, [square(0, 0, 1, 1)], "top"))).toBe(100);
  });

  test("a square with a square hole fills the even-odd difference", () => {
    const g: RasterGrid = { w: 40, h: 40, res: 10 };
    const outer = fillPolygonEvenOdd(g, [square(-1, -1, 1, 1)], "bottom");
    const hole = fillPolygonEvenOdd(g, [square(-0.5, -0.5, 0.5, 0.5)], "bottom");
    const both = fillPolygonEvenOdd(g, [square(-1, -1, 1, 1), square(-0.5, -0.5, 0.5, 0.5)], "bottom");
    // computed: 20 x 20 - 10 x 10
    expect(count(both)).toBe(300);
    for (let p = 0; p < both.length; p++) expect(both[p]).toBe(outer[p]! & (hole[p]! ^ 1));
  });

  test("bottom puts row 0 at the smallest y, top at the largest", () => {
    const g: RasterGrid = { w: 10, h: 10, res: 1 };
    const low = square(-5, -5, 5, -4);
    expect([...fillPolygonEvenOdd(g, [low], "bottom").subarray(0, 10)]).toEqual(Array(10).fill(1));
    expect(count(fillPolygonEvenOdd(g, [low], "bottom").subarray(10))).toBe(0);
    expect([...fillPolygonEvenOdd(g, [low], "top").subarray(90)]).toEqual(Array(10).fill(1));
  });

  test("one ring with rows top equals SPRUE fromPolygon cell for cell", () => {
    const S = sprue();
    const pt = fc.tuple(fc.double({ min: -6, max: 6, noNaN: true }), fc.double({ min: -6, max: 6, noNaN: true }));
    fc.assert(
      fc.property(fc.array(pt, { minLength: 3, maxLength: 12 }), fc.integer({ min: 8, max: 40 }), fc.double({ min: 1, max: 6, noNaN: true }), (poly, w, ppm) => {
        const ring = poly as unknown as Ring;
        const want = S.fromPolygon(w, w + 3, ppm, ring).d;
        const got = fillPolygonEvenOdd({ w, h: w + 3, res: ppm }, [ring], "top");
        expect(Buffer.from(got).equals(Buffer.from(want))).toBe(true);
      }),
      { numRuns: 300, seed: 315532800 },
    );
  });

  test("the fixture is SPRUE's own text where sprue.html is on this machine", (ctx) => {
    if (!existsSync(SPRUE_PATH)) return ctx.skip();
    const lines = readFileSync(SPRUE_PATH, "utf8").split("\n");
    expect(lines.slice(FROM_POLYGON_FIRST_LINE - 1, FROM_POLYGON_FIRST_LINE - 1 + FROM_POLYGON_LINES.length)).toEqual(FROM_POLYGON_LINES);
  });
});

describe("flattenSvgPath", () => {
  const html = readFileSync(root + "designs/collar/legacy/collar.html", "utf8").split("\n");
  const markPath = (line: number): string => /= "([^"]+)";$/.exec(html[line - 1]!)![1]!;
  const ARC = markPath(605), WRENCH = markPath(606);

  test("the mark arc: one ring from translate(490, 121), points by hand from m0 0h38l34 3 29 5", () => {
    const rings = flattenSvgPath(ARC, [1, 0, 0, 1, 490, 121]);
    expect(rings).toHaveLength(1);
    expect(rings[0]!.slice(0, 4)).toEqual([[490, 121], [528, 121], [562, 124], [591, 129]]);
  });

  test("both mark paths stay inside the viewBox 117 103 800 800", () => {
    for (const [d, tx, ty] of [[ARC, 490, 121], [WRENCH, 498, 314]] as const) {
      const [ring] = flattenSvgPath(d, [1, 0, 0, 1, tx, ty]);
      expect(ring![0]).toEqual([tx, ty]);
      for (const [x, y] of ring!) {
        expect(x).toBeGreaterThanOrEqual(117);
        expect(x).toBeLessThanOrEqual(917);
        expect(y).toBeGreaterThanOrEqual(103);
        expect(y).toBeLessThanOrEqual(903);
      }
    }
  });

  test("absolute and relative M L H V, implicit lineto, Z returns to the subpath start", () => {
    expect(flattenSvgPath("M1 2 3 4H5V6L7 8z")).toEqual([[[1, 2], [3, 4], [5, 4], [5, 6], [7, 8]]]);
    expect(flattenSvgPath("m1 2 3 4h1v2l-1-1Zl1 1 1-1")).toEqual([[[1, 2], [4, 6], [5, 6], [5, 8], [4, 7]], [[1, 2], [2, 3], [3, 2]]]);
    expect(flattenSvgPath("M0 0L1e1 .5", [2, 0, 0, -1, 1, 3])).toEqual([[[1, 3], [21, 2.5]]]);
  });

  test("a curve or junk is E_SCHEMA", () => {
    expect(() => flattenSvgPath("M0 0C1 1 2 2 3 3")).toThrow(/E_SCHEMA \/svgPath/);
    expect(() => flattenSvgPath("M0 0L1")).toThrow(/E_SCHEMA/);
    expect(() => flattenSvgPath("0 0L1 1")).toThrow(/E_SCHEMA/);
    expect(() => flattenSvgPath("M0 0 # 1")).toThrow(/E_SCHEMA/);
  });
});

describe("vector surface", () => {
  const g: RasterGrid = { w: 20, h: 20, res: 2 };

  test("fillPath reads back as the even-odd fill at 255, rows bottom first, mapped by the transform", () => {
    const s = vectorSurface(g);
    s.fillPath("M0 0H4V2H0Z", [0.5, 0, 0, 0.5, -1, -4]);
    const want = fillPolygonEvenOdd(g, [square(-1, -4, 1, -3)], "bottom");
    expect([...s.readAlpha(g)]).toEqual([...want].map((v) => v * 255));
    expect(count(want)).toBe(8);
    const rgba = s.readRgba(g);
    expect(rgba.data.filter((_, i) => i % 4 === 3).every((a, p) => a === want[p]! * 255)).toBe(true);
    expect(rgba.data.filter((_, i) => i % 4 !== 3).every((v) => v === 0)).toBe(true);
  });

  test("two paths fill on their own and union; clear empties", () => {
    const s = vectorSurface(g);
    s.fillPath("M-2-2H2V2H-2Z", [1, 0, 0, 1, 0, 0]);
    s.fillPath("M-1-1H1V1H-1Z", [1, 0, 0, 1, 0, 0]);
    expect(count(s.readAlpha(g)) / 255).toBe(64);
    s.clear();
    expect(count(s.readAlpha(g))).toBe(0);
  });

  test("text and images refuse in node; a foreign grid is E_SCHEMA", () => {
    const s = vectorSurface(g);
    expect(() => s.measure("a", "Permanent Marker")).toThrow(/E_KERNEL/);
    expect(() => s.fillText("a", "Permanent Marker")).toThrow(/E_KERNEL.*font outline/);
    expect(() => s.drawImage({ width: 2, height: 2 })).toThrow(/E_KERNEL.*resampler/);
    expect(() => s.readAlpha({ w: 20, h: 20, res: 3 })).toThrow(/E_SCHEMA \/grid/);
  });
});
