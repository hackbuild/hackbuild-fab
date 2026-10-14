// The two polygon constructions COFFER builds every electrode from, in the
// form its geometry library computes them, so the port's point sets equal
// the original's (the originals rule, Hausdorff 1e-6 mm on outlines).
//
// Source of record: originals/coffer/files/hexcore.py lines 65 to 75
// (hexagon), 80 to 82 (rounded) and 97 to 102 (hexlet): a convex polygon is
// inset by r with mitred corners and grown back by r with round joins,
// `buffer(-r, join_style=2).buffer(r, join_style=1, quad_segs=q)`. On a
// convex polygon the mitred inset is the polygon of the edge lines moved in
// by r, and the round growth puts at each corner an arc about the inset
// vertex from one edge normal to the next, split into
// trunc(angle / (90 deg / q) + 0.5) equal steps, which is how GEOS
// (shapely 2.1.2) fillets a corner. The arc points take Math.cos and
// Math.sin at arbitrary angles, which no per-count table holds (D-175 open,
// as the PIP stick port does).

import type { Vec2 } from "@hackbuild/spec";

/** Signed area times two; positive counter-clockwise. */
function area2(ring: readonly Vec2[]): number {
  let a = 0;
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length] as Vec2;
    a += p[0] * q[1] - q[0] * p[1];
  });
  return a;
}

const ccw = (ring: readonly Vec2[]): Vec2[] => (area2(ring) < 0 ? [...ring].reverse() : [...ring]);

/** The outward unit normal of edge a to b on a counter-clockwise ring. */
function normal(a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  return [dy / l, -dx / l];
}

/** A convex ring with every edge moved in by d, corners mitred: the intersections of the moved edge lines. */
export function insetConvex(ring: readonly Vec2[], d: number): Vec2[] {
  const r = ccw(ring);
  const n = r.length;
  const line = (i: number): { p: Vec2; dir: Vec2 } => {
    const a = r[i] as Vec2, b = r[(i + 1) % n] as Vec2;
    const [nx, ny] = normal(a, b);
    return { p: [a[0] - nx * d, a[1] - ny * d], dir: [b[0] - a[0], b[1] - a[1]] };
  };
  return r.map((_, i) => {
    const l0 = line((i + n - 1) % n), l1 = line(i);
    const den = l0.dir[0] * l1.dir[1] - l0.dir[1] * l1.dir[0];
    const t = ((l1.p[0] - l0.p[0]) * l1.dir[1] - (l1.p[1] - l0.p[1]) * l1.dir[0]) / den;
    return [l0.p[0] + t * l0.dir[0], l0.p[1] + t * l0.dir[1]];
  });
}

/** A convex ring grown by r with round joins of quadSegs segments per quarter turn. */
export function growRound(ring: readonly Vec2[], r: number, quadSegs: number): Vec2[] {
  const v = ccw(ring);
  const n = v.length;
  const quantum = Math.PI / 2 / quadSegs;
  const out: Vec2[] = [];
  v.forEach((p, i) => {
    const n0 = normal(v[(i + n - 1) % n] as Vec2, p);
    const n1 = normal(p, v[(i + 1) % n] as Vec2);
    const a0 = Math.atan2(n0[1], n0[0]);
    let total = Math.atan2(n1[1], n1[0]) - a0;
    if (total < 0) total += 2 * Math.PI;
    const segs = Math.trunc(total / quantum + 0.5);
    out.push([p[0] + r * n0[0], p[1] + r * n0[1]]);
    for (let j = 1; j < segs; j++) {
      const a = a0 + (j * total) / segs;
      out.push([p[0] + r * Math.cos(a), p[1] + r * Math.sin(a)]);
    }
    out.push([p[0] + r * n1[0], p[1] + r * n1[1]]);
  });
  return out;
}

/** hexcore.py `rounded(pts, r)` (lines 80 to 82) on a convex ring: inset by r mitred, grown by r round. */
export function roundedConvex(ring: readonly Vec2[], r: number, quadSegs: number): Vec2[] {
  return growRound(insetConvex(ring, r), r, quadSegs);
}

/** Largest distance from any point of a to the nearest point of b, and back: the point set Hausdorff distance, mm. */
export function hausdorff(a: readonly Vec2[], b: readonly Vec2[]): number {
  const one = (x: readonly Vec2[], y: readonly Vec2[]): number => {
    let worst = 0;
    for (const p of x) {
      let best = Infinity;
      for (const q of y) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
      worst = Math.max(worst, best);
    }
    return worst;
  };
  return Math.max(one(a, b), one(b, a));
}
