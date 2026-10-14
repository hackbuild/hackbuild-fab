// COLLAR blank shapes in geom against two shipped sources: the verbatim
// SHAPES fixture (fixtures/collar-shapes.ts) for the implicit functions, and
// shapeR and baseLUT run unchanged from designs/collar/legacy/collar.html.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { OUTLINE_LUT_N, SHAPES, outlineLUT, outlineMinR, shapeR, type ShapeKind } from "../src/index.js";
import { SHAPES as VERBATIM } from "./fixtures/collar-shapes.js";

const KINDS = Object.keys(VERBATIM) as ShapeKind[];
const root = fileURLToPath(new URL("../../../", import.meta.url));

/** collar.html lines 636 to 732 and 898 to 909, run as shipped with ST in scope. */
function legacy(): { ST: { dia: number; shape: { kind: string; aspect: number; corner: number } }; shapeR(t: number): number; baseLUT(): Float32Array } {
  const html = readFileSync(root + "designs/collar/legacy/collar.html", "utf8");
  const want = readFileSync(root + "designs/collar/legacy/sha256.txt", "utf8").split(/\s+/)[0];
  expect(createHash("sha256").update(html).digest("hex")).toBe(want);
  const L = html.split("\n");
  expect(L[642]).toMatch(/^const ST = \{/);
  expect(L[897]).toMatch(/^const LUT_N = 8192;/);
  const body = [...L.slice(635, 732), ...L.slice(897, 909)].join("\n");
  return new Function(`${body}\nreturn { ST, shapeR, baseLUT };`)();
}

describe("COLLAR shapes", () => {
  test("nine kinds, the same set as the verbatim fixture", () => {
    expect(Object.keys(SHAPES).sort()).toEqual([...KINDS].sort());
    expect(KINDS).toHaveLength(9);
  });

  test("every implicit function equals the verbatim COLLAR one bit for bit", () => {
    const v = fc.double({ min: -30, max: 30, noNaN: true });
    fc.assert(
      fc.property(fc.constantFrom(...KINDS), v, v, fc.double({ min: 5, max: 40, noNaN: true }), fc.double({ min: 0.2, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (k, x, y, R, aspect, corner) => {
        const p = { aspect, corner };
        expect(Object.is(SHAPES[k].f(x, y, R, p), VERBATIM[k]!.f(x, y, R, p))).toBe(true);
        expect(SHAPES[k].label).toBe(VERBATIM[k]!.label);
      }),
      { numRuns: 4000, seed: 315532800 },
    );
  });

  test.each(KINDS)("%s: shapeR and the outline table equal COLLAR's, and the widest point is dia / 2", (kind) => {
    const c = legacy();
    for (const [dia, aspect, corner] of [[44, 0.72, 0.3], [31.5, 0.5, 0.9]] as const) {
      c.ST.dia = dia;
      Object.assign(c.ST.shape, { kind, aspect, corner });
      const p = { aspect, corner };
      for (const t of [-Math.PI, -2, -0.3, 0, 0.7, 1.9, 3]) expect(shapeR(kind, p, dia / 2, t)).toBe(c.shapeR(t));
      const lut = outlineLUT(kind, p, dia);
      expect(lut).toHaveLength(OUTLINE_LUT_N);
      expect(Buffer.from(lut.buffer).equals(Buffer.from(c.baseLUT().buffer))).toBe(true);
      expect(Math.max(...lut)).toBeCloseTo(dia / 2, 5);
      expect(outlineMinR(lut)).toBe(Math.min(...lut));
    }
  });
});
