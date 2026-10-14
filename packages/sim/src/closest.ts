// Closest approach between a query and a triangle mesh (M02-T07). Two
// measures, both unsigned distances in mm, computed:
//
// pointsToMesh is the measure check_sweep.py reports (lineage
// ogee16.check-sweep/r16p, the `trimesh.proximity.closest_point(sw,
// b.vertices)` line): the smallest distance from a set of query points to
// the mesh surface. Fed the eight corners of a box it ignores the box faces
// and edges, so it can read larger than the true gap.
//
// boxToMesh is the true gap from an axis-aligned box to the mesh: the
// smallest distance between any triangle and the box solid, zero when a
// triangle touches or enters it. A crank head passing over the middle of a
// servo face is seen here and missed by the corner measure.
//
// The sim measures and never decides: neither function holds a threshold.

import type { Vec3 } from "@hackbuild/spec";

/** Indexed triangles in mm, the layout of @hackbuild/mesh MeshData. */
export interface TriMesh {
  readonly positions: ArrayLike<number>;
  readonly triangles: ArrayLike<number>;
}

export interface Approach {
  /** Smallest distance found, mm (computed); 0 for contact or overlap. */
  readonly mm: number;
  /** Point on the mesh at that distance, mm. */
  readonly at: Vec3;
  /** Point on the query (a query point, or the box surface) at that distance, mm. */
  readonly from: Vec3;
}

type V = [number, number, number];

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Closest point to p on triangle abc (Ericson, Real-Time Collision Detection 5.1.5). */
export function closestOnTriangle(p: V, a: V, b: V, c: V): V {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b);
  const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return lerp(a, b, d1 / (d1 - d3));
  const cp = sub(p, c);
  const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return lerp(a, c, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return lerp(b, c, (d4 - d3) / (d4 - d3 + (d5 - d6)));
  const denom = 1 / (va + vb + vc);
  const v = vb * denom, w = vc * denom;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

function vert(m: TriMesh, i: number): V {
  const p = m.positions;
  return [p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!];
}

/** Smallest distance from any of points to the surface of mesh (the check_sweep.py measure). */
export function pointsToMesh(points: readonly Vec3[], mesh: TriMesh): Approach {
  let best: Approach = { mm: Infinity, at: [NaN, NaN, NaN], from: [NaN, NaN, NaN] };
  let best2 = Infinity;
  const t = mesh.triangles;
  for (let i = 0; i < t.length; i += 3) {
    const a = vert(mesh, t[i]!), b = vert(mesh, t[i + 1]!), c = vert(mesh, t[i + 2]!);
    for (const q of points) {
      const p: V = [q[0], q[1], q[2]];
      const x = closestOnTriangle(p, a, b, c);
      const d = sub(p, x), d2 = dot(d, d);
      if (d2 < best2) {
        best2 = d2;
        best = { mm: Math.sqrt(d2), at: x, from: q };
      }
    }
  }
  return best;
}

/** An axis-aligned box by centre and full extents, mm. */
export interface Box {
  readonly center: Vec3;
  readonly extents: Vec3;
}

/** The eight corners of a box, in trimesh.creation.box vertex order (x slowest). */
export function boxCorners(b: Box): Vec3[] {
  const out: Vec3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    out.push([b.center[0] + (sx * b.extents[0]) / 2, b.center[1] + (sy * b.extents[1]) / 2, b.center[2] + (sz * b.extents[2]) / 2]);
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * Closest points of two segments when both lie strictly inside their
 * segments (Ericson, Real-Time Collision Detection 5.1.9, unclamped), else
 * null. A pair that clamps to an endpoint, and every parallel pair, has an
 * endpoint of one segment in its closest pair, which the vertex and corner
 * passes of triangleToBox already measure.
 */
function edgeEdge(p1: V, q1: V, p2: V, q2: V): { c1: V; c2: V } | null {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  const a = dot(d1, d1), b = dot(d1, d2), c = dot(d1, r), e = dot(d2, d2), f = dot(d2, r);
  const denom = a * e - b * b;
  if (!(denom > 1e-12 * a * e)) return null;
  const s = (b * f - c * e) / denom, t = (a * f - b * c) / denom;
  if (s <= 0 || s >= 1 || t <= 0 || t >= 1) return null;
  return { c1: lerp(p1, q1, s), c2: lerp(p2, q2, t) };
}

/** The triangle clipped to the closed box (Sutherland-Hodgman over the six faces); empty when they are apart. */
function clipToBox(a: V, b: V, c: V, lo: V, hi: V): V[] {
  let poly: V[] = [a, b, c];
  for (let k = 0; k < 3 && poly.length > 0; k += 1) {
    for (const [bound, side] of [[lo[k]!, 1], [hi[k]!, -1]] as const) {
      const out: V[] = [];
      for (let i = 0; i < poly.length; i += 1) {
        const p = poly[i]!, q = poly[(i + 1) % poly.length]!;
        const dp = side * (p[k]! - bound), dq = side * (q[k]! - bound);
        if (dp >= 0) out.push(p);
        if ((dp >= 0) !== (dq >= 0)) out.push(lerp(p, q, dp / (dp - dq)));
      }
      poly = out;
      if (poly.length === 0) break;
    }
  }
  return poly;
}

/**
 * Exact distance from a triangle to a box solid. Touching or overlapping
 * when the triangle clipped to the closed box is not empty. Otherwise the
 * two convex sets are apart and their closest pair is a feature pair: a
 * triangle vertex against the box (clamp), a box corner against the
 * triangle, or a triangle edge against a box edge. An iterative projection
 * can stall short of the minimum on skew pairs, so none is used.
 */
function triangleToBox(a: V, b: V, c: V, lo: V, hi: V): { d2: number; on: V; box: V } {
  const clipped = clipToBox(a, b, c, lo, hi);
  if (clipped.length > 0) {
    const m: V = [0, 0, 0];
    for (const p of clipped) for (let k = 0; k < 3; k += 1) m[k] = m[k]! + p[k]! / clipped.length;
    const x: V = [clamp(m[0], lo[0], hi[0]), clamp(m[1], lo[1], hi[1]), clamp(m[2], lo[2], hi[2])];
    return { d2: 0, on: x, box: x };
  }
  let best = { d2: Infinity, on: a, box: a };
  const take = (on: V, box: V): void => {
    const d = sub(on, box), d2 = dot(d, d);
    if (d2 < best.d2) best = { d2, on, box };
  };
  const tri = [a, b, c];
  for (const p of tri) take(p, [clamp(p[0], lo[0], hi[0]), clamp(p[1], lo[1], hi[1]), clamp(p[2], lo[2], hi[2])]);
  const corner = (i: number): V => [i & 4 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 1 ? hi[2] : lo[2]];
  for (let i = 0; i < 8; i += 1) {
    const q = corner(i);
    take(closestOnTriangle(q, a, b, c), q);
  }
  for (let i = 0; i < 8; i += 1) {
    for (const bit of [1, 2, 4]) {
      if (i & bit) continue;
      const q0 = corner(i), q1 = corner(i | bit);
      for (let e = 0; e < 3; e += 1) {
        const r = edgeEdge(tri[e]!, tri[(e + 1) % 3]!, q0, q1);
        if (r) take(r.c1, r.c2);
      }
    }
  }
  return best;
}

/** True gap from a box solid to a mesh surface, mm; 0 when a triangle touches or enters the box. */
export function boxToMesh(b: Box, mesh: TriMesh): Approach {
  const lo: V = [b.center[0] - b.extents[0] / 2, b.center[1] - b.extents[1] / 2, b.center[2] - b.extents[2] / 2];
  const hi: V = [b.center[0] + b.extents[0] / 2, b.center[1] + b.extents[1] / 2, b.center[2] + b.extents[2] / 2];
  let best2 = Infinity;
  let best: Approach = { mm: Infinity, at: [NaN, NaN, NaN], from: [NaN, NaN, NaN] };
  const t = mesh.triangles;
  for (let i = 0; i < t.length; i += 3) {
    const a = vert(mesh, t[i]!), bb = vert(mesh, t[i + 1]!), c = vert(mesh, t[i + 2]!);
    // A triangle whose bounds sit further from the box than the best so far cannot improve it.
    let gap2 = 0;
    for (let k = 0; k < 3; k += 1) {
      const tlo = Math.min(a[k]!, bb[k]!, c[k]!), thi = Math.max(a[k]!, bb[k]!, c[k]!);
      const g = tlo > hi[k]! ? tlo - hi[k]! : lo[k]! > thi ? lo[k]! - thi : 0;
      gap2 += g * g;
    }
    if (gap2 >= best2) continue;
    const r = triangleToBox(a, bb, c, lo, hi);
    if (r.d2 < best2) {
      best2 = r.d2;
      best = { mm: Math.sqrt(r.d2), at: r.on, from: r.box };
    }
  }
  return best;
}
