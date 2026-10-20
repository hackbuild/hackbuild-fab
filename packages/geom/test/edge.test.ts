// R1-engine-05: edge profiles d(z). Each kind is checked at 9 heights
// against its profile written as a geometric relation (a point on the
// round's circle, on the chamfer line), not against the formula edge.ts
// evaluates. The band volume repeats geometry-strategy.md row 2a (40 x 30 x
// 10, corner r 4, top round R 2, bottom chamfer 0.6, layer 0.2; the
// prototype measured -0.0151 percent) on the geom rounded rectangle, against
// the integral of the section area taken in closed form.

import { describe, expect, test } from "vitest";
import { edgeInset, edgeMaxInset, offsetRRect, ringArea2, rrect, rrectRing, type EdgeProfile } from "../src/index.js";

const H = 10;
const TOL = 1e-12;
/** Nine distances from the face across a zone of height e, ends included. */
const nine = (e: number): number[] => Array.from({ length: 9 }, (_, i) => (e * i) / 8);

/** d at distance t from the face, read once from the top and once from the bottom; both must agree. */
function bothFaces(p: EdgeProfile, t: number): number {
  const top = edgeInset({ top: p }, H, H - t);
  const bottom = edgeInset({ bottom: p }, H, t);
  expect(top).toBeCloseTo(bottom, 12);
  return bottom;
}

describe("d(z) against each profile's closed form at 9 heights (computed)", () => {
  test("round R 2: (R - d)^2 + (R - t)^2 = R^2 inside the zone", () => {
    const R = 2;
    for (const t of nine(R)) {
      const d = bothFaces({ kind: "round", size: R }, t);
      expect(Math.abs((R - d) ** 2 + (R - t) ** 2 - R * R)).toBeLessThan(1e-9);
      expect(d).toBeGreaterThanOrEqual(0);
    }
    expect(bothFaces({ kind: "round", size: R }, 0)).toBe(R);
    expect(bothFaces({ kind: "round", size: R }, R)).toBe(0);
  });

  test("chamfer 0.6 at 45 and 0.5 at 60 deg: d + t / tan(a) = size", () => {
    for (const [size, a] of [[0.6, 45], [0.5, 60]] as const) {
      const p: EdgeProfile = a === 45 ? { kind: "chamfer", size } : { kind: "chamfer", size, angleDeg: a };
      const e = size * Math.tan((a * Math.PI) / 180);
      for (const t of nine(e)) expect(Math.abs(bothFaces(p, t) + t / Math.tan((a * Math.PI) / 180) - size)).toBeLessThan(1e-9);
    }
  });

  test("chamfer on both faces equals COLLAR insetAt max(0, cham - z, cham - (thk - z)) (collar.html 1215 to 1218)", () => {
    const cham = 0.5, thk = 3.2;
    for (const z of nine(thk)) {
      const collar = Math.max(0, cham - z, cham - (thk - z));
      expect(Math.abs(edgeInset({ top: { kind: "chamfer", size: cham }, bottom: { kind: "chamfer", size: cham } }, thk, z) - collar)).toBeLessThan(TOL);
    }
  });

  test("cove R 1.5: d^2 + t^2 = R^2, the round's complement R - round(R - t)", () => {
    const R = 1.5;
    for (const t of nine(R)) {
      const d = bothFaces({ kind: "cove", size: R }, t);
      expect(Math.abs(d * d + t * t - R * R)).toBeLessThan(1e-9);
      expect(Math.abs(d - (R - bothFaces({ kind: "round", size: R }, R - t)))).toBeLessThan(1e-9);
    }
  });

  test("teardrop R 2: the 45 deg flat d + t = R(2 - sqrt 2) below the tangent at R(1 - 1/sqrt 2), the round above", () => {
    const R = 2, tStar = R * (1 - Math.SQRT1_2);
    for (const t of nine(R)) {
      const d = bothFaces({ kind: "teardrop", size: R }, t);
      if (t < tStar) expect(Math.abs(d + t - R * (2 - Math.SQRT2))).toBeLessThan(1e-9);
      else expect(Math.abs((R - d) ** 2 + (R - t) ** 2 - R * R)).toBeLessThan(1e-9);
      // No overhang past 45 deg: the inset falls no faster than one mm per mm of height.
      if (t > 0) expect(bothFaces({ kind: "teardrop", size: R }, t - 1e-3) - d).toBeLessThanOrEqual(1e-3 + 1e-9);
    }
  });

  test("foot 0.5 high, 0.25 inset (KNURL footZ and foot): constant inset on the first size mm, then none", () => {
    for (const t of nine(1)) expect(bothFaces({ kind: "foot", size: 0.5, inset: 0.25 }, t)).toBe(t < 0.5 ? 0.25 : 0);
  });
});

describe("swept volume of the round on a 40 x 30 x 10 rounded rectangle (geometry-strategy.md row 2a)", () => {
  test("layer bands at mid-band inset are within 0.04 percent of the analytic integral (computed)", () => {
    const W = 40, L = 30, RC = 4, R = 2, CH = 0.6, LAYER = 0.2;
    const spec = { top: { kind: "round", size: R }, bottom: { kind: "chamfer", size: CH } } as const;
    const base = rrect(0, 0, W / 2, L / 2, RC);
    const zs = new Set<number>([0, H]);
    for (let i = 0; i * LAYER <= CH + 1e-9; i++) zs.add(Math.round(i * LAYER * 1e6) / 1e6);
    for (let i = 0; i * LAYER <= R + 1e-9; i++) zs.add(Math.round((H - R + i * LAYER) * 1e6) / 1e6);
    const u = [...zs].sort((a, b) => a - b);
    let banded = 0;
    for (let i = 0; i < u.length - 1; i++) {
      const d = edgeInset(spec, H, (u[i]! + u[i + 1]!) / 2, Math.min(W, L) / 2);
      banded += (ringArea2(rrectRing(offsetRRect(base, -d)!)) / 2) * (u[i + 1]! - u[i]!);
    }
    // Section area A(d) = (W - 2d)(L - 2d) - (4 - pi)(RC - d)^2 = a0 + a1 d + a2 d^2 while d <= RC.
    const a0 = W * L - (4 - Math.PI) * RC * RC, a1 = -2 * (W + L) + 2 * (4 - Math.PI) * RC, a2 = 4 - (4 - Math.PI);
    // Integrals of d and d^2: chamfer d = CH - z over [0, CH]; round d = R - sqrt(R^2 - u^2) over u in [0, R].
    const intD = CH ** 2 / 2 + R * R * (1 - Math.PI / 4);
    const intD2 = CH ** 3 / 3 + R ** 3 * (5 / 3 - Math.PI / 2);
    const analytic = a0 * H + a1 * intD + a2 * intD2;
    const errPct = ((banded - analytic) / analytic) * 100;
    expect(analytic).toBeCloseTo(11727.044, 2); // the prototype's 200,000 step integral, computed
    expect(Math.abs(errPct)).toBeLessThan(0.04);
    expect(u.length - 1).toBe(14); // 3 chamfer bands, 1 straight, 10 round bands (computed)
  });
});

describe("refusals", () => {
  test("an inset at or over the outline inradius is E_UNSAT, never an empty ring", () => {
    expect(edgeMaxInset({ top: { kind: "round", size: 2 }, bottom: { kind: "foot", size: 0.5, inset: 0.25 } })).toBe(2);
    expect(() => edgeInset({ top: { kind: "round", size: 2 } }, H, 9, 2)).toThrow(/^E_UNSAT \/edge /);
    expect(edgeInset({ top: { kind: "round", size: 2 } }, H, 9, 2.01)).toBeGreaterThan(0);
  });
  test("zones taller than the body, a foot with no inset, an angle on a round, z outside the body", () => {
    expect(() => edgeInset({ top: { kind: "round", size: 6 }, bottom: { kind: "round", size: 5 } }, H, 1)).toThrow(/^E_UNSAT \/edge /);
    expect(() => edgeInset({ bottom: { kind: "foot", size: 0.5 } }, H, 0)).toThrow(/^E_SCHEMA \/edge\/bottom\/inset /);
    expect(() => edgeInset({ top: { kind: "round", size: 2, inset: 0.1 } }, H, 0)).toThrow(/^E_SCHEMA \/edge\/top\/inset /);
    expect(() => edgeInset({ top: { kind: "round", size: 2, angleDeg: 30 } }, H, 0)).toThrow(/^E_SCHEMA \/edge\/top\/angleDeg /);
    // 7 deg is 7/360 of a turn, past the 256 point unit-circle table (D-175); 22.5 deg is 1/16 and passes.
    expect(() => edgeInset({ top: { kind: "chamfer", size: 0.5, angleDeg: 7 } }, H, H)).toThrow(/^E_SCHEMA \/edge\/top\/angleDeg /);
    expect(edgeInset({ top: { kind: "chamfer", size: 0.5, angleDeg: 22.5 } }, H, H)).toBe(0.5);
    expect(() => edgeInset({ top: { kind: "chamfer", size: 0 } }, H, 0)).toThrow(/^E_SCHEMA \/edge\/top\/size /);
    expect(() => edgeInset({}, H, H + 0.1)).toThrow(/^E_SCHEMA \/z /);
  });
});
