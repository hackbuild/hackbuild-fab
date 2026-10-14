// Arc fitting for the cut writers, ported from SKETCH IO.fitArcs and
// IO.wholeCircle (sketch.html lines 2884 to 2964, the bench of
// lineage sketch.bench/v3; the copy M07-T03 names under
// x/plan-to-refine/handoff/hbf/designs/sketch/legacy/ is byte identical).
// Everything upstream is a polyline; a laser would rather have arcs, so
// they are fitted back on the way out: a closed ring that is one circle
// within 0.02 mm becomes a CIRCLE, and runs of vertices on a common circle
// within 0.1 mm become arc segments, which the DXF writer turns into
// LWPOLYLINE bulges tan(sweep/4) and the SVG twin into A commands.
//
// One change from the page, recorded in the lineage row: wholeCircle tested
// only the vertices against the mean radius, so a regular octagon (every
// vertex on one circle) came back a circle whatever its size. Here the
// midpoint of every edge must also lie within the tolerance of the circle,
// the same sagitta rule fitArcs applies through chordOk.

import type { Ring, Vec2 } from "@hackbuild/spec";

/** Tolerance of the whole circle test, mm (sketch.html lines 2976 and 3060). */
export const CIRCLE_TOL = 0.02;
/** Tolerance of the arc fit, mm (sketch.html lines 2984 and 3063). */
export const ARC_TOL = 0.1;

export interface Circle {
  readonly c: Vec2;
  /** mm */
  readonly r: number;
}

export type Segment =
  | { readonly kind: "line"; readonly a: Vec2; readonly b: Vec2 }
  | {
      readonly kind: "arc"; readonly a: Vec2; readonly b: Vec2; readonly c: Vec2;
      /** mm */
      readonly r: number;
      /** True when the arc runs counter-clockwise from a to b. */
      readonly ccw: boolean;
      /** Unsigned sweep, rad. */
      readonly sweep: number;
    };

function circleThrough(a: Vec2, b: Vec2, c: Vec2): Circle | null {
  const [ax, ay] = a, [bx, by] = b, [cx, cy] = c;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const r = Math.hypot(ax - ux, ay - uy);
  if (!Number.isFinite(r) || r > 1e6 || r < 1e-6) return null;
  return { c: [ux, uy], r };
}

const sideOf = (a: Vec2, b: Vec2, p: Vec2): number => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

function angDiff(c: Vec2, a: Vec2, b: Vec2, ccw: boolean): number {
  const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
  const a1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
  let d = a1 - a0;
  if (ccw) while (d < 0) d += Math.PI * 2;
  else while (d > 0) d -= Math.PI * 2;
  return d;
}

/** A closed ring that is one circle: every vertex and every edge midpoint within tol of the mean radius about the vertex centroid. */
export function wholeCircle(pts: readonly Vec2[], tol: number = CIRCLE_TOL): Circle | null {
  if (pts.length < 8) return null;
  let cx = 0, cy = 0;
  for (const p of pts) {
    cx += p[0];
    cy += p[1];
  }
  cx /= pts.length;
  cy /= pts.length;
  let r = 0;
  for (const p of pts) r += Math.hypot(p[0] - cx, p[1] - cy);
  r /= pts.length;
  if (r < 1e-6) return null;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!, q = pts[(i + 1) % pts.length]!;
    if (Math.abs(Math.hypot(p[0] - cx, p[1] - cy) - r) > tol) return null;
    if (Math.abs(Math.hypot((p[0] + q[0]) / 2 - cx, (p[1] + q[1]) / 2 - cy) - r) > tol) return null;
  }
  return { c: [cx, cy], r };
}

/**
 * A polyline as line and arc segments. The sagitta test matters: any four
 * corners of a rectangle sit on a common circle, so radius agreement alone
 * would turn finger teeth into arcs. A closed ring is walked from its first
 * vertex back to it.
 */
export function fitArcs(pts: readonly Vec2[], closed: boolean, tol: number = ARC_TOL): Segment[] {
  const P = pts.slice();
  const first = P[0]!, last = P[P.length - 1]!;
  if (closed && (first[0] !== last[0] || first[1] !== last[1])) P.push(first);
  const n = P.length;
  const out: Segment[] = [];
  const onCircle = (fit: Circle, p: Vec2): boolean => Math.abs(Math.hypot(p[0] - fit.c[0], p[1] - fit.c[1]) - fit.r) <= tol;
  const chordOk = (fit: Circle, a: Vec2, b: Vec2): boolean => {
    const m: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > fit.r * 1.2) return false; // chord too coarse to be an arc
    return Math.abs(Math.hypot(m[0] - fit.c[0], m[1] - fit.c[1]) - fit.r) <= tol;
  };
  const collinearRun = (i: number): number => {
    let j = i + 1;
    while (j + 1 < n) {
      const L = Math.hypot(P[j + 1]![0] - P[i]![0], P[j + 1]![1] - P[i]![1]) || 1;
      if (Math.abs(sideOf(P[i]!, P[j + 1]!, P[j]!)) / L > tol * 0.3) break;
      j++;
    }
    return j;
  };
  let i = 0;
  while (i < n - 1) {
    let arc: (Circle & { ccw: boolean }) | null = null;
    let jbest = -1;
    if (i + 3 < n) {
      const fit = circleThrough(P[i]!, P[i + 1]!, P[i + 2]!);
      if (fit && fit.r < 1e4 && chordOk(fit, P[i]!, P[i + 1]!) && chordOk(fit, P[i + 1]!, P[i + 2]!)) {
        const side = sideOf(P[i]!, P[i + 1]!, P[i + 2]!) > 0; // sign of the turn, not of the bulge
        let j = i + 2;
        while (j + 1 < n) {
          const q = P[j + 1]!;
          if (!onCircle(fit, q) || !chordOk(fit, P[j]!, q)) break;
          if (sideOf(P[j - 1]!, P[j]!, q) > 0 !== side) break;
          j++;
        }
        const sweep = Math.abs(angDiff(fit.c, P[i]!, P[j]!, side));
        if (j - i >= 3 && sweep > 0.2 && sweep < Math.PI * 1.999) {
          arc = { ...fit, ccw: side };
          jbest = j;
        }
      }
    }
    if (arc) {
      out.push({ kind: "arc", a: P[i]!, b: P[jbest]!, c: arc.c, r: arc.r, ccw: arc.ccw, sweep: Math.abs(angDiff(arc.c, P[i]!, P[jbest]!, arc.ccw)) });
      i = jbest;
    } else {
      const k = collinearRun(i);
      out.push({ kind: "line", a: P[i]!, b: P[k]! });
      i = k;
    }
  }
  return out;
}

/** The bulge of a segment on the vertex it starts at: tan(sweep/4), signed positive counter-clockwise (sketch.html line 3071). */
export const bulgeOf = (s: Segment): number => (s.kind === "arc" ? Math.tan(((s.ccw ? 1 : -1) * s.sweep) / 4) : 0);

/** A ring's vertices without a repeated closing vertex or consecutive duplicates. */
export function openRing(ring: Ring): Vec2[] {
  const out: Vec2[] = [];
  for (const p of ring) {
    const q = out[out.length - 1];
    if (q === undefined || q[0] !== p[0] || q[1] !== p[1]) out.push([p[0], p[1]]);
  }
  while (out.length > 1 && out[0]![0] === out[out.length - 1]![0] && out[0]![1] === out[out.length - 1]![1]) out.pop();
  return out;
}
