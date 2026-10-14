// The KEYWAY family's geometry helpers on geom's CrossSection (D-163),
// ported from the helpers every gen_<name>.py repeats
// (reference/copper/keyway/legacy/gen_keyway.py lines 66 to 78,
// reference/copper/quadrant/legacy/gen_quadrant.py lines 74 to 85,
// reference/copper/tessera/legacy/gen_tessera.py lines 75 to 96), plus the
// shapely measurements the gates read: distance, islands, holes, a
// vertical cut's length, containment and intersection.
//
// Shapely buffers at resolution 16, which is 16 segments per quarter
// circle; every round offset here asks Clipper2 for 64 segments per full
// circle to match. Rounded rectangles and wire joins are built from their
// analytic arcs at the same 16 per quarter.
//
// Coordinates enter unsnapped (snap: false): the vinyl family is a parity
// route against shapely's float64 geometry, which is not on the D-054
// 1/1024 mm grid (geom cs.ts names this exemption). M05-T14 states it.

import type { Geom, Section } from "@hackbuild/geom";
import type { Mm, Ring, Vec2 } from "@hackbuild/spec";

/** Shapely's buffer resolution in the family: segments per quarter circle. */
export const QUAD_SEGS = 16;
/** Segments per full circle for Clipper2 round offsets, 4 x QUAD_SEGS. */
export const ROUND_SEGMENTS = 4 * QUAD_SEGS;
/** Area under which a difference counts as empty, mm2 (float64 noise from Clipper2's integer scaling). */
export const AREA_EPS = 1e-6;

const ccw = (r: Ring): Ring => (area2(r) < 0 ? [...r].reverse() : r);

/** Twice the signed area of a ring, mm2. */
export function area2(r: Ring): number {
  let s = 0;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) s += r[j]![0] * r[i]![1] - r[i]![0] * r[j]![1];
  return s;
}

/** Shapely's rounded rectangle: r clamped to half the short side less 0.001 (gen_keyway.py lines 66 to 68). */
export function rrRing(x0: Mm, y0: Mm, x1: Mm, y1: Mm, r: Mm): Ring {
  const rc = Math.min(r, (x1 - x0) / 2 - 0.001, (y1 - y0) / 2 - 0.001);
  if (!(rc > 0)) return boxRing(x0, y0, x1, y1);
  const corners: readonly (readonly [number, number, number])[] = [
    [x1 - rc, y0 + rc, -Math.PI / 2],
    [x1 - rc, y1 - rc, 0],
    [x0 + rc, y1 - rc, Math.PI / 2],
    [x0 + rc, y0 + rc, Math.PI],
  ];
  const out: Vec2[] = [];
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= QUAD_SEGS; k++) {
      const a = a0 + (k * Math.PI) / 2 / QUAD_SEGS;
      out.push([cx + rc * Math.cos(a), cy + rc * Math.sin(a)]);
    }
  }
  return out;
}

export function boxRing(x0: Mm, y0: Mm, x1: Mm, y1: Mm): Ring {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

/** Circle of radius r about c, ROUND_SEGMENTS vertices from angle 0. */
export function circleRing(c: Vec2, r: Mm): Ring {
  const out: Vec2[] = [];
  for (let k = 0; k < ROUND_SEGMENTS; k++) {
    const a = (2 * Math.PI * k) / ROUND_SEGMENTS;
    out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return out;
}

export type Radius = Mm | ((deg: number) => Mm);

/** Annular sector options: the family's segment rule n = max(nMin, |a1 - a0| / stepDeg) unless n is given. */
export interface AnnulusOptions {
  readonly n?: number;
  /** QUADRANT 12, TESSERA 10. */
  readonly nMin?: number;
  /** QUADRANT 1.5, TESSERA 1.2. */
  readonly stepDeg?: number;
}

/** The family's helpers bound to one geom handle. */
export class Vinyl {
  readonly g: Geom;

  constructor(g: Geom) {
    this.g = g;
  }

  /** Rings under the positive fill rule, unsnapped, each made counter-clockwise first. */
  poly(...rings: readonly Ring[]): Section {
    return this.g.fromRings(rings.map(ccw), { fillRule: "Positive", snap: false });
  }

  /** Rings with holes as given: outer counter-clockwise, holes clockwise. */
  rings(rings: readonly Ring[]): Section {
    return rings.length === 0 ? this.g.empty() : this.g.fromRings(rings, { fillRule: "Positive", snap: false });
  }

  box(x0: Mm, y0: Mm, x1: Mm, y1: Mm): Section {
    return this.poly(boxRing(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)));
  }

  rr(x0: Mm, y0: Mm, x1: Mm, y1: Mm, r: Mm): Section {
    return this.poly(rrRing(x0, y0, x1, y1, r));
  }

  /**
   * LineString(pts).buffer(w / 2, cap flat, join round): one rectangle per
   * segment with flat ends, unioned with a disc at every interior vertex,
   * which fills exactly the round join's outer wedge.
   */
  wire(pts: readonly Vec2[], w: Mm): Section {
    const h = w / 2;
    const parts: Ring[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i]!;
      const [bx, by] = pts[i + 1]!;
      const len = Math.hypot(bx - ax, by - ay);
      if (len === 0) continue;
      const nx = (-(by - ay) / len) * h;
      const ny = ((bx - ax) / len) * h;
      parts.push([[ax - nx, ay - ny], [bx - nx, by - ny], [bx + nx, by + ny], [ax + nx, ay + ny]]);
    }
    for (let i = 1; i + 1 < pts.length; i++) parts.push(circleRing(pts[i]!, h));
    return this.g.union(parts.map((r) => this.poly(r)));
  }

  /** Round offset, outward positive, at the family's resolution. */
  buffer(s: Section, d: Mm): Section {
    if (s.isEmpty() || d === 0) return s;
    return s.offset(d, { join: "Round", segments: ROUND_SEGMENTS });
  }

  /** Closing then opening by d (gen_keyway.py lines 73 to 74); d 0.4 or 0.25 by board. */
  smooth(s: Section, d: Mm): Section {
    return this.buffer(this.buffer(s, d), -d);
  }

  /** Drop every hole (gen_keyway.py lines 76 to 78). */
  outerOnly(s: Section): Section {
    return this.rings(components(s).map((c) => c.outer));
  }

  union(list: readonly Section[]): Section {
    return this.g.union(list.filter((s) => !s.isEmpty()));
  }

  /** Points of polar angle a, degrees, at radius r about c. */
  pol(c: Vec2, r: Mm, deg: number): Vec2 {
    const t = (deg * Math.PI) / 180;
    return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];
  }

  /** Annular sector about c; either radius may be a function of angle, which is how wedge electrodes taper in polar space. */
  annulus(c: Vec2, rIn: Radius, rOut: Radius, a0: number, a1: number, opts: AnnulusOptions = {}): Section {
    const n = opts.n ?? Math.max(opts.nMin ?? 12, Math.trunc(Math.abs(a1 - a0) / (opts.stepDeg ?? 1.5)));
    const fi = typeof rIn === "function" ? rIn : () => rIn;
    const fo = typeof rOut === "function" ? rOut : () => rOut;
    const pts: Vec2[] = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(this.pol(c, fo(a), a));
    }
    for (let i = 0; i <= n; i++) {
      const a = a1 - ((a1 - a0) * i) / n;
      pts.push(this.pol(c, fi(a), a));
    }
    return this.poly(pts);
  }

  /** Points closer to p than to q, as a big quad on p's side of the bisector (gen_tessera.py lines 87 to 96). */
  halfplane(p: Vec2, q: Vec2, big: Mm = 900): Section {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const nx = (q[0] - p[0]) / L, ny = (q[1] - p[1]) / L;
    const tx = -ny, ty = nx;
    return this.poly([
      [mx + tx * big, my + ty * big], [mx - tx * big, my - ty * big],
      [mx - tx * big - nx * big, my - ty * big - ny * big], [mx + tx * big - nx * big, my + ty * big - ny * big],
    ]);
  }

  /** Map every vertex; a reflection reverses each ring so outers stay counter-clockwise. */
  map(s: Section, fn: (p: Vec2) => Vec2, reflects = false): Section {
    const rings = s.toRings({ snap: false }).map((r) => r.map(fn));
    return this.rings(reflects ? rings.map((r) => [...r].reverse()) : rings);
  }

  translate(s: Section, dx: Mm, dy: Mm): Section {
    return this.map(s, ([x, y]) => [x + dx, y + dy]);
  }

  /** Rotate by deg counter-clockwise about origin. */
  rotate(s: Section, deg: number, origin: Vec2 = [0, 0]): Section {
    const t = (deg * Math.PI) / 180;
    const c = Math.cos(t), sn = Math.sin(t);
    return this.map(s, ([x, y]) => {
      const dx = x - origin[0], dy = y - origin[1];
      return [origin[0] + c * dx - sn * dy, origin[1] + sn * dx + c * dy];
    });
  }

  /** Scale about origin; a negative product reflects. */
  scale(s: Section, sx: number, sy: number, origin: Vec2 = [0, 0]): Section {
    return this.map(s, ([x, y]) => [origin[0] + sx * (x - origin[0]), origin[1] + sy * (y - origin[1])], sx * sy < 0);
  }
}

/** Rings grouped by outline, unsnapped. */
export function components(s: Section): { readonly outer: Ring; readonly holes: Ring[] }[] {
  return s.isEmpty() ? [] : s.components({ snap: false });
}

/** Polygon count, shapely's len(geoms) or 1 for a Polygon; 0 when empty. */
export function islands(s: Section): number {
  return components(s).length;
}

/** Every hole ring. */
export function holes(s: Section): Ring[] {
  return components(s).flatMap((c) => c.holes);
}

/** Even-odd point in region. */
export function pointIn(s: Section, p: Vec2): boolean {
  let inside = false;
  for (const r of s.rings) {
    for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
      const [xi, yi] = r[i]!;
      const [xj, yj] = r[j]!;
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

interface Seg {
  readonly ax: number; readonly ay: number; readonly bx: number; readonly by: number;
  readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number;
}

function segments(s: Section): Seg[] {
  const out: Seg[] = [];
  for (const r of s.rings) {
    for (let i = 0, n = r.length; i < n; i++) {
      const [ax, ay] = r[i]!;
      const [bx, by] = r[(i + 1) % n]!;
      out.push({ ax, ay, bx, by, x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: Math.min(ay, by), y1: Math.max(ay, by) });
    }
  }
  return out;
}

function pointSeg(px: number, py: number, s: Seg): number {
  const dx = s.bx - s.ax, dy = s.by - s.ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - s.ax) * dx + (py - s.ay) * dy) / l2));
  return Math.hypot(px - (s.ax + t * dx), py - (s.ay + t * dy));
}

function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function crosses(a: Seg, b: Seg): boolean {
  const d1 = orient(b.ax, b.ay, b.bx, b.by, a.ax, a.ay);
  const d2 = orient(b.ax, b.ay, b.bx, b.by, a.bx, a.by);
  const d3 = orient(a.ax, a.ay, a.bx, a.by, b.ax, b.ay);
  const d4 = orient(a.ax, a.ay, a.bx, a.by, b.bx, b.by);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function segSeg(a: Seg, b: Seg): number {
  if (crosses(a, b)) return 0;
  return Math.min(pointSeg(a.ax, a.ay, b), pointSeg(a.bx, a.by, b), pointSeg(b.ax, b.ay, a), pointSeg(b.bx, b.by, a));
}

/**
 * Shapely's distance between two regions, mm: 0 when they touch or one
 * holds a point of the other, else the least segment to segment distance.
 * B's segments are swept by x, so only a window of them is visited per
 * segment of A.
 */
export function distance(a: Section, b: Section): number {
  if (a.isEmpty() || b.isEmpty()) return Number.POSITIVE_INFINITY;
  const first = (s: Section): Vec2 => s.rings[0]![0]!;
  if (pointIn(a, first(b)) || pointIn(b, first(a))) return 0;
  const sa = segments(a);
  const sb = segments(b).sort((p, q) => p.x0 - q.x0);
  let maxLen = 0;
  for (const s of sb) maxLen = Math.max(maxLen, s.x1 - s.x0);
  let best = Number.POSITIVE_INFINITY;
  const lowerBound = (x: number): number => {
    let lo = 0, hi = sb.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sb[mid]!.x0 < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  for (const s of sa) {
    const from = Number.isFinite(best) ? lowerBound(s.x0 - best - maxLen) : 0;
    for (let i = from; i < sb.length; i++) {
      const t = sb[i]!;
      if (t.x0 > s.x1 + best) break;
      if (t.x1 < s.x0 - best || t.y0 > s.y1 + best || t.y1 < s.y0 - best) continue;
      const d = segSeg(s, t);
      if (d < best) {
        best = d;
        if (best === 0) return 0;
      }
    }
  }
  return best;
}

/** Length of the vertical line at x from y0 to y1 that lies inside s, mm (shapely intersection(...).length). */
export function cutLength(s: Section, x: Mm, y0: Mm, y1: Mm): number {
  const ys: number[] = [];
  for (const r of s.rings) {
    for (let i = 0, n = r.length; i < n; i++) {
      const [ax, ay] = r[i]!;
      const [bx, by] = r[(i + 1) % n]!;
      if ((ax <= x) !== (bx <= x)) ys.push(ay + ((x - ax) * (by - ay)) / (bx - ax));
    }
  }
  ys.sort((p, q) => p - q);
  let len = 0;
  for (let i = 0; i + 1 < ys.length; i += 2) {
    const lo = Math.max(ys[i]!, y0);
    const hi = Math.min(ys[i + 1]!, y1);
    if (hi > lo) len += hi - lo;
  }
  return len;
}

/** a contains b: nothing of b lies outside a. */
export function contains(a: Section, b: Section): boolean {
  if (b.isEmpty()) return true;
  return b.difference(a).area() < AREA_EPS;
}

/** a and b share at least a boundary point. */
export function intersects(a: Section, b: Section): boolean {
  return distance(a, b) === 0;
}

/**
 * Shapely's centroid of a region: the area weighted mean of its rings'
 * centroids, holes subtracting (Section rings carry outers counter-clockwise
 * and holes clockwise, so the signed sums do it). Empty has no centroid.
 */
export function centroid(s: Section): Vec2 {
  let a = 0, cx = 0, cy = 0;
  for (const r of s.rings) {
    for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
      const [xj, yj] = r[j]!;
      const [xi, yi] = r[i]!;
      const k = xj * yi - xi * yj;
      a += k;
      cx += (xj + xi) * k;
      cy += (yj + yi) * k;
    }
  }
  if (a === 0) return [Number.NaN, Number.NaN];
  return [cx / (3 * a), cy / (3 * a)];
}

/** Area of a intersected with b, mm2. */
export function overlapArea(a: Section, b: Section): number {
  if (a.isEmpty() || b.isEmpty()) return 0;
  return a.intersection(b).area();
}

/**
 * A point inside a simple ring, as GEOS InteriorPointArea picks one: the
 * midpoint of the widest interval a horizontal line through the middle of
 * the bounds cuts.
 */
export function interiorPoint(r: Ring): Vec2 {
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of r) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  let y = (y0 + y1) / 2;
  // A scan line through a vertex is nudged off it so every crossing is a proper one.
  if (r.some((p) => p[1] === y)) y += (y1 - y0) * 1e-7;
  const xs: number[] = [];
  for (let i = 0, n = r.length; i < n; i++) {
    const [ax, ay] = r[i]!;
    const [bx, by] = r[(i + 1) % n]!;
    if ((ay <= y) !== (by <= y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
  }
  xs.sort((p, q) => p - q);
  let best: Vec2 = r[0]!;
  let width = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (xs[i + 1]! - xs[i]! > width) {
      width = xs[i + 1]! - xs[i]!;
      best = [(xs[i]! + xs[i + 1]!) / 2, y];
    }
  }
  return best;
}

/**
 * Distances within this of the least count as one tie, mm. manifold's
 * CrossSection hands rings back at float32 precision (the SPLICE gap
 * 0.94 reads 0.9399999976, computed 2026-10-08), whose step at 200 mm is
 * 1.5e-5 mm; GEOS keeps float64 and breaks exact ties by rounding under
 * 1e-13 mm. Either kernel's tightest pair is a member of the tie at this
 * tolerance, which is far under the 0.001 mm the gates print.
 */
export const TIE_MM = 1e-4;

/** Least distance over every pair of named regions, in list order, with every pair tied with it. */
export function tightestPairs(named: readonly (readonly [string, Section])[], tie: number = TIE_MM): { readonly least: number; readonly pair: string; readonly ties: readonly string[] } {
  const all: { pair: string; d: number }[] = [];
  for (let i = 0; i < named.length; i++) for (let j = i + 1; j < named.length; j++) all.push({ pair: `${named[i]![0]}/${named[j]![0]}`, d: distance(named[i]![1], named[j]![1]) });
  const least = all.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...all.map((x) => x.d));
  const ties = all.filter((x) => x.d <= least + tie).map((x) => x.pair);
  return { least, pair: ties[0] ?? "", ties };
}
