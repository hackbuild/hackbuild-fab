// M00-T03 step 7: COLLAR outline offsets through geom against the verbatim
// COLLAR shape functions. For each distance-defined kind at the COLLAR
// defaults (dia 44, aspect 0.72, corner 0.3) and each offset d in {-2.2 (rim
// width), -0.5 (chamfer), +0.5}, every output vertex before snapping has
// |sdf(p) - d| at most 1e-6 mm (computed). Rounded kinds go through the
// exact rounded-rectangle offset; polygons through a Miter offset of a
// CrossSection built without the entry snap (the snap would move a
// non-dyadic hexagon vertex by up to 1/2048 mm, computed). squircle and
// shield are level sets, not distances, and are not applicable.

import { beforeAll, describe, expect, test } from "vitest";
import type { Ring, Vec2 } from "@hackbuild/spec";
import { loadGeom, offsetRRect, q, rrect, type Geom, type RRect } from "../src/index.js";
import { SHAPES, ST_DEFAULTS } from "./fixtures/collar-shapes.js";

const R = ST_DEFAULTS.dia / 2;
const P = ST_DEFAULTS.shape;
const OFFSETS = [-ST_DEFAULTS.rim.w, -ST_DEFAULTS.cham, +ST_DEFAULTS.cham] as const;
const TOLERANCE = 1e-6;
/** Miter limit for the polygon offsets; the triangle needs 2 (1 / sin 30 deg, computed). */
const MITER_LIMIT = 4;

const ROUNDED: Record<string, RRect> = {
  round: rrect(0, 0, R, R, R),
  rounded: rrect(0, 0, R / Math.SQRT2, R / Math.SQRT2, (R / Math.SQRT2) * P.corner),
  dogtag: rrect(0, 0, R, R * P.aspect, R * P.aspect),
  bar: rrect(0, 0, R, R * P.aspect, R * P.aspect * P.corner),
};
const POLYGONS: Record<string, number> = { hex: 6, oct: 8, tri: 3 };
const NOT_APPLICABLE = ["squircle", "shield"] as const;

/** ngon outline: vertices midway between the COLLAR face normals, circumradius R. */
function ngonRing(n: number): Ring {
  const ring: Vec2[] = [];
  for (let k = 0; k < n; k++) {
    const t = Math.PI / 2 + Math.PI / n + (2 * Math.PI * k) / n;
    ring.push([R * Math.cos(t), R * Math.sin(t)]);
  }
  return ring;
}

let g: Geom;
beforeAll(async () => {
  g = await loadGeom();
});

function outline(kind: string, d: number): Ring[] {
  const rr = ROUNDED[kind];
  if (rr !== undefined) {
    const off = offsetRRect(rr, d);
    if (off === null) throw new Error(`${kind} empties at offset ${d}`);
    return g.rrect(off, { snap: false }).toRings({ snap: false });
  }
  const n = POLYGONS[kind]!;
  return g
    .fromRings([ngonRing(n)], { snap: false })
    .offset(d, { join: "Miter", miterLimit: MITER_LIMIT })
    .toRings({ snap: false });
}

describe("COLLAR outline offsets (M00-T03 step 7)", () => {
  const kinds = [...Object.keys(ROUNDED), ...Object.keys(POLYGONS)];

  test("the case table covers every COLLAR shape kind", () => {
    expect([...kinds, ...NOT_APPLICABLE].sort()).toEqual(Object.keys(SHAPES).sort());
  });

  test("21 cases within 1e-6 mm at every output vertex before snapping (computed)", () => {
    const lines: string[] = [];
    let cases = 0;
    let worst = 0;
    for (const kind of kinds) {
      const f = SHAPES[kind]!.f;
      for (const d of OFFSETS) {
        const rings = outline(kind, d);
        expect(rings.length).toBe(1);
        let max = 0;
        let verts = 0;
        for (const ring of rings) {
          for (const [x, y] of ring) {
            max = Math.max(max, Math.abs(f(x, y, R, P) - d));
            verts++;
          }
        }
        expect(verts).toBeGreaterThan(2);
        expect(max).toBeLessThanOrEqual(TOLERANCE);
        worst = Math.max(worst, max);
        cases++;
        lines.push(`${kind.padEnd(8)} d ${d >= 0 ? "+" : ""}${d.toFixed(1)} mm  vertices ${String(verts).padStart(3)}  max |sdf - d| ${max.toExponential(2)} mm (computed)`);
      }
    }
    for (const kind of NOT_APPLICABLE) lines.push(`${kind.padEnd(8)} not applicable: a level set, not a distance`);
    lines.push(`cases ${cases}, max residual ${worst.toExponential(2)} mm (computed), not applicable ${NOT_APPLICABLE.length}`);
    process.stdout.write(`${lines.join("\n")}\n`);
    expect(cases).toBe(21);
  });

  test("snapping the emitted outline moves no vertex by more than half a grid step per axis (computed)", () => {
    for (const kind of kinds) {
      for (const d of OFFSETS) {
        for (const ring of outline(kind, d)) {
          for (const [x, y] of ring) {
            expect(Math.abs(q(x) - x)).toBeLessThanOrEqual(1 / 2048);
            expect(Math.abs(q(y) - y)).toBeLessThanOrEqual(1 / 2048);
          }
        }
      }
    }
  });

  test("an inward offset past the corner radius gives a sharp corner", () => {
    const off = offsetRRect(ROUNDED.bar!, -5)!;
    expect(off.rc).toBe(0);
    expect(off.a).toBeCloseTo(R - 5, 12);
    expect(offsetRRect(ROUNDED.round!, -R)).toBeNull();
  });
});
