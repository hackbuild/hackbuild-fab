// M02-T07 closest approach, unit level. The ogee sweep reaches these functions
// only through rotate.ts, and its pinned approaches resolve in vertex or edge
// regions, so a wrong face-interior projection survived the whole suite
// (verifier round 1, V5). Expected values here come from hand arithmetic on
// axis-aligned triangles, or from an independent reference written below: the
// point is projected onto the triangle plane, kept if all three edge cross
// products agree in sign with the normal, otherwise the nearest of the three
// clamped segment points wins. That reference shares no code or region logic
// with the Ericson Voronoi-region walk in src/closest.ts.

import { describe, expect, test } from "vitest";
import { boxToMesh, closestOnTriangle, pointsToMesh, type TriMesh } from "../src/closest.js";
import { createPrng } from "../src/prng.js";

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a: V, b: V): number => Math.sqrt(dot(sub(a, b), sub(a, b)));

function onSegment(p: V, a: V, b: V): V {
  const ab = sub(b, a);
  const t = Math.min(1, Math.max(0, dot(sub(p, a), ab) / dot(ab, ab)));
  return add(a, mul(ab, t));
}

/** Independent reference: plane projection with an inside test, else the nearest edge point. */
function reference(p: V, a: V, b: V, c: V): V {
  const n = cross(sub(b, a), sub(c, a));
  const q = sub(p, mul(n, dot(sub(p, a), n) / dot(n, n)));
  const inside =
    dot(cross(sub(b, a), sub(q, a)), n) >= 0 &&
    dot(cross(sub(c, b), sub(q, b)), n) >= 0 &&
    dot(cross(sub(a, c), sub(q, c)), n) >= 0;
  if (inside) return q;
  const cands = [onSegment(p, a, b), onSegment(p, b, c), onSegment(p, c, a)];
  return cands.reduce((m, x) => (dist(p, x) < dist(p, m) ? x : m));
}

describe("closestOnTriangle face interior", () => {
  // Right triangle in z = 0, legs 4 mm on x and 6 mm on y (asymmetric, so the
  // two barycentric weights differ and a swapped weight moves the answer).
  const a: V = [0, 0, 0], b: V = [4, 0, 0], c: V = [0, 6, 0];

  test("a point 3 mm above (1, 2) projects straight down (hand arithmetic)", () => {
    const x = closestOnTriangle([1, 2, 3], a, b, c);
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(2, 12);
    expect(x[2]).toBeCloseTo(0, 12);
  });

  test("a tilted face: the foot of the perpendicular from a point over the centroid", () => {
    const ta: V = [1, 0, 0], tb: V = [0, 2, 0], tc: V = [0, 0, 3];
    const centroid: V = [1 / 3, 2 / 3, 1];
    const n = cross(sub(tb, ta), sub(tc, ta));
    const p = add(centroid, mul(n, 0.7 / Math.sqrt(dot(n, n))));
    const x = closestOnTriangle(p, ta, tb, tc);
    for (let k = 0; k < 3; k += 1) expect(x[k]).toBeCloseTo(centroid[k]!, 12);
    expect(dist(p, x)).toBeCloseTo(0.7, 12);
  });

  test("seeded points around arbitrary triangles match the independent reference in every region", () => {
    const r = createPrng(7);
    const u = (): number => r.next() * 20 - 10;
    let faces = 0;
    for (let i = 0; i < 2000; i += 1) {
      const ta: V = [u(), u(), u()], tb: V = [u(), u(), u()], tc: V = [u(), u(), u()];
      const p: V = [u(), u(), u()];
      const want = reference(p, ta, tb, tc);
      const got = closestOnTriangle(p, ta, tb, tc);
      expect(dist(p, got)).toBeCloseTo(dist(p, want), 9);
      expect(dist(got, want)).toBeLessThan(1e-6);
      const n = cross(sub(tb, ta), sub(tc, ta));
      const q = sub(p, mul(n, dot(sub(p, ta), n) / dot(n, n)));
      if (dist(q, want) < 1e-9) faces += 1;
    }
    // The sample must exercise the face-interior branch, not only edges and vertices.
    expect(faces).toBeGreaterThan(100);
  });
});

describe("mesh measures over a face", () => {
  // One quad, 10 mm by 20 mm in z = 0, as two triangles.
  const quad: TriMesh = {
    positions: [0, 0, 0, 10, 0, 0, 10, 20, 0, 0, 20, 0],
    triangles: [0, 1, 2, 0, 2, 3],
  };

  test("pointsToMesh from a point over the middle of a face reads the height (hand arithmetic)", () => {
    const r = pointsToMesh([[3, 7, 2.5]], quad);
    expect(r.mm).toBeCloseTo(2.5, 12);
    expect(r.at[0]).toBeCloseTo(3, 12);
    expect(r.at[1]).toBeCloseTo(7, 12);
    expect(r.at[2]).toBeCloseTo(0, 12);
  });

  test("boxToMesh over the middle of a face reads the gap to the box underside (hand arithmetic)", () => {
    const r = boxToMesh({ center: [4, 9, 3], extents: [2, 2, 2] }, quad);
    expect(r.mm).toBeCloseTo(2, 9);
    expect(r.at[2]).toBeCloseTo(0, 9);
    expect(r.from[2]).toBeCloseTo(2, 9);
    expect(r.at[0]).toBeGreaterThanOrEqual(3 - 1e-9);
    expect(r.at[0]).toBeLessThanOrEqual(5 + 1e-9);
    expect(r.at[1]).toBeGreaterThanOrEqual(8 - 1e-9);
    expect(r.at[1]).toBeLessThanOrEqual(10 + 1e-9);
  });
});

// boxToMesh against triangles that do not sit square to the box (verifier
// round 2, R5). The ogee sweep geometry is axis-aligned, so the sweep goldens
// never reach a skew pair or an edge-against-edge gap. The reference here is dense barycentric sampling of the
// triangle, each sample clamped into the box: the smallest sample distance is
// an upper bound on the true gap and lies within maxEdge / n of it, since
// distance to a box is 1-Lipschitz. It shares no code with src/closest.ts.
describe("boxToMesh on skew triangles", () => {
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  const tri = (a: V, b: V, c: V): TriMesh => ({ positions: [...a, ...b, ...c], triangles: [0, 1, 2] });

  function sampled(a: V, b: V, c: V, lo: V, hi: V, n: number): number {
    let best = Infinity;
    for (let i = 0; i <= n; i += 1) {
      for (let j = 0; i + j <= n; j += 1) {
        const s = i / n, t = j / n, w = 1 - s - t;
        const p: V = add(add(mul(a, w), mul(b, s)), mul(c, t));
        const q: V = [clamp(p[0], lo[0], hi[0]), clamp(p[1], lo[1], hi[1]), clamp(p[2], lo[2], hi[2])];
        best = Math.min(best, dist(p, q));
      }
    }
    return best;
  }

  test("an edge crossing over a box edge reads the skew-line distance 1/sqrt(5) mm (hand arithmetic)", () => {
    // Box [0, 2]^3. The triangle lies in y = 1; its edge (3, 1, 1) to (1, 1, 5)
    // passes the box edge x = 2, z = 2 at 2/sqrt(20) mm, at s = 0.3 along it.
    // Its vertices clamp to the box at 1 mm or more and the box corners sit
    // sqrt(1.2) mm or more from it, so only an edge pair finds the gap.
    const r = boxToMesh({ center: [1, 1, 1], extents: [2, 2, 2] }, tri([3, 1, 1], [1, 1, 5], [6, 1, 6]));
    expect(r.mm).toBeCloseTo(1 / Math.sqrt(5), 12);
    for (const [k, v] of [2.4, 1, 2.2].entries()) expect(r.at[k]).toBeCloseTo(v, 12);
    for (const [k, v] of [2, 1, 2].entries()) expect(r.from[k]).toBeCloseTo(v, 12);
  });

  test("a large triangle slicing through the box with no vertex inside reads 0 (hand arithmetic)", () => {
    const r = boxToMesh({ center: [1, 1, 1], extents: [2, 2, 2] }, tri([-10, -10, 1], [10, -10, 1], [0, 10, 1]));
    expect(r.mm).toBe(0);
    expect(r.at[2]).toBeCloseTo(1, 12);
  });

  test("400 seeded triangle and box pairs (seed 11) land within the sampled bound", () => {
    const r = createPrng(11);
    const u = (): number => r.next() * 20 - 10;
    const n = 200;
    let apart = 0, touching = 0;
    for (let i = 0; i < 400; i += 1) {
      const a: V = [u(), u(), u()], b: V = [u(), u(), u()], c: V = [u(), u(), u()];
      const center: V = [u() * 0.3, u() * 0.3, u() * 0.3];
      const ext: V = [1 + r.next() * 6, 1 + r.next() * 6, 1 + r.next() * 6];
      const lo = sub(center, mul(ext, 0.5)), hi = add(center, mul(ext, 0.5));
      const got = boxToMesh({ center, extents: ext }, tri(a, b, c));
      const ref = sampled(a, b, c, lo, hi, n);
      const h = Math.max(dist(a, b), dist(b, c), dist(c, a)) / n;
      expect(got.mm, `pair ${i}`).toBeLessThanOrEqual(ref + 1e-9);
      expect(got.mm, `pair ${i}`).toBeGreaterThanOrEqual(ref - h - 1e-9);
      // The witnesses are a triangle point and a box point that far apart.
      expect(dist(got.at as V, got.from as V)).toBeCloseTo(got.mm, 9);
      expect(dist(got.at as V, reference(got.at as V, a, b, c))).toBeLessThan(1e-9);
      for (let k = 0; k < 3; k += 1) {
        expect(got.from[k]).toBeGreaterThanOrEqual(lo[k]! - 1e-12);
        expect(got.from[k]).toBeLessThanOrEqual(hi[k]! + 1e-12);
      }
      if (got.mm === 0) touching += 1;
      else apart += 1;
    }
    // Both the overlap branch and the feature-pair branch must be exercised.
    expect(touching).toBeGreaterThan(30);
    expect(apart).toBeGreaterThan(30);
  });
});
