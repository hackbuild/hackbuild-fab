// M00-T03 step 8: union and difference areas through geom equal the
// polygon-clipping results of BOSS kernel.js within 1e-6 mm2 (computed).
// The fixture is written by tools/legacy/boss-booleans.cjs; inputs are the
// kernel.js rings as built, entered without the snap so both sides see the
// same coordinates.
//
// kernel.js cleans every boolean result onto a 1e-6 mm grid (cleanRing),
// which by itself moves the rrect and stroke areas by up to 3.8e-6 mm2
// (computed), above the 1e-6 mm2 the card sets. Geom is held to 1e-6 mm2
// against polygon-clipping's own output before that cleaning, and to the
// cleaning bound, perimeter x 1e-6 mm (computed), against kernel.js mArea.

import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { Ring } from "@hackbuild/spec";
import { loadGeom, type Geom, type Section } from "../src/index.js";

type MultiPolygon = number[][][][];
interface Fixture {
  readonly name: string;
  readonly a: MultiPolygon;
  readonly b: MultiPolygon;
  readonly areaA: number;
  readonly areaB: number;
  readonly union: number;
  readonly difference: number;
  readonly unionRaw: number;
  readonly differenceRaw: number;
  readonly unionPerimeter: number;
  readonly differencePerimeter: number;
}
interface FixtureFile {
  readonly source: { readonly member: string; readonly memberSha256: string };
  readonly versions: Record<string, string>;
  readonly fixtures: readonly Fixture[];
}

const file = JSON.parse(readFileSync(new URL("./fixtures/boss-booleans.json", import.meta.url), "utf8")) as FixtureFile;
const TOLERANCE = 1e-6;

let g: Geom;
beforeAll(async () => {
  g = await loadGeom();
});

const section = (mp: MultiPolygon): Section => g.fromRings(mp.flat() as unknown as Ring[], { snap: false });

describe("BOSS boolean parity (M00-T03 step 8)", () => {
  test("fixture came from the pinned kernel.js on earcut 2.2.4 and polygon-clipping 0.15.7", () => {
    expect(file.source.memberSha256).toBe("344d80b3df3b6b15e5861de343a03c79663669fd700578bf162f97afba499de1");
    expect(file.versions).toEqual({ earcut: "2.2.4", "polygon-clipping": "0.15.7" });
    expect(file.fixtures.map((f) => f.name)).toEqual(["rect", "rrect", "ring2", "stroke", "circle-hole"]);
  });

  for (const f of file.fixtures) {
    test(`${f.name}: input, union and difference areas within 1e-6 mm2 of polygon-clipping (computed)`, () => {
      const a = section(f.a);
      const b = section(f.b);
      const got = { a: a.area(), b: b.area(), union: a.union(b).area(), difference: a.difference(b).area() };
      const want = { a: f.areaA, b: f.areaB, union: f.unionRaw, difference: f.differenceRaw };
      const d = (k: keyof typeof got): string => (got[k] - want[k]).toExponential(1);
      process.stdout.write(
        `${f.name.padEnd(12)} union ${got.union.toFixed(6)} vs ${want.union.toFixed(6)} (delta ${d("union")}), ` +
          `difference ${got.difference.toFixed(6)} vs ${want.difference.toFixed(6)} (delta ${d("difference")}) mm2, computed\n`,
      );
      for (const k of ["a", "b", "union", "difference"] as const) expect(Math.abs(got[k] - want[k])).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(got.union - f.union)).toBeLessThanOrEqual(f.unionPerimeter * 1e-6);
      expect(Math.abs(got.difference - f.difference)).toBeLessThanOrEqual(f.differencePerimeter * 1e-6);
    });
  }
});
