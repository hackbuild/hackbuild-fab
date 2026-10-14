// Rounded rectangles kept analytic until emit. An offset of a rounded
// rectangle is again a rounded rectangle, so offsets compose without the
// vertex error a polygon offset accumulates. The distance function is the
// rounded-box SDF COLLAR uses (collar.html lines 709 to 712).

import type { Mm, Ring, Vec2 } from "@hackbuild/spec";
import { checkSegments, unitCircle } from "./unit-circle.js";

/** Centre (cx, cy), half extents a and b, corner radius rc, all mm. rc is at most min(a, b). */
export interface RRect {
  readonly cx: Mm;
  readonly cy: Mm;
  readonly a: Mm;
  readonly b: Mm;
  readonly rc: Mm;
}

/** Minimum angle per circular segment, degrees (COTTER geo.js line 13). */
export const MIN_CIRCULAR_ANGLE = 8;
/** Minimum circular edge length, mm (COTTER geo.js line 13). */
export const MIN_CIRCULAR_EDGE_LENGTH: Mm = 0.35;

/**
 * Segments for a full circle of radius r, the rule manifold applies after
 * setMinCircularAngle(8) and setMinCircularEdgeLength(0.35): min of the angle
 * and length counts, plus 3, rounded down to a multiple of 4, at least 4.
 */
export function circularSegments(r: Mm): number {
  const byAngle = Math.trunc(360 / MIN_CIRCULAR_ANGLE);
  const byLength = Math.trunc((2 * Math.PI * r) / MIN_CIRCULAR_EDGE_LENGTH);
  let n = Math.min(byAngle, byLength) + 3;
  n -= n % 4;
  return Math.max(n, 4);
}

/** A rounded rectangle with its corner radius clamped into [0, min(a, b)]. */
export function rrect(cx: Mm, cy: Mm, a: Mm, b: Mm, rc: Mm): RRect {
  return { cx, cy, a, b, rc: Math.min(Math.max(rc, 0), a, b) };
}

/**
 * Offset by d, mm, outward positive: {a + d, b + d, max(rc + d, 0)}. Inward
 * past rc the corner becomes sharp, which is the exact level set of the
 * rounded-box distance. Returns null when the offset empties the shape.
 */
export function offsetRRect(r: RRect, d: Mm): RRect | null {
  const a = r.a + d;
  const b = r.b + d;
  if (!(a > 0 && b > 0)) return null;
  return { cx: r.cx, cy: r.cy, a, b, rc: Math.max(r.rc + d, 0) };
}

/** Signed distance from p to the rounded rectangle, mm; negative inside. */
export function rrectDistance(r: RRect, p: Vec2): Mm {
  const qx = Math.abs(p[0] - r.cx) - (r.a - r.rc);
  const qy = Math.abs(p[1] - r.cy) - (r.b - r.rc);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r.rc;
}

/**
 * Counter-clockwise ring of the rounded rectangle, unsnapped, starting at
 * the bottom of the right edge. Every vertex lies on the boundary to float64
 * rounding. segments is per full circle and defaults to circularSegments(rc);
 * each corner gets a quarter of it, rounded, at least 1, and corner points
 * come from the D-175 unit-circle table at 4 * quarter points, so 4 * quarter
 * may not pass UNIT_CIRCLE_MAX_SEGMENTS (E_SCHEMA). Corners whose straight
 * run is zero share their end vertex once.
 */
export function rrectRing(r: RRect, segments?: number): Ring {
  const ex = r.a - r.rc;
  const ey = r.b - r.rc;
  if (r.rc <= 0) {
    return [
      [r.cx + r.a, r.cy - r.b],
      [r.cx + r.a, r.cy + r.b],
      [r.cx - r.a, r.cy + r.b],
      [r.cx - r.a, r.cy - r.b],
    ];
  }
  const quarter = Math.max(1, Math.round((segments ?? circularSegments(r.rc)) / 4));
  const n = 4 * quarter;
  checkSegments(n, "/segments");
  // Corner centre offset and the table index where its quarter starts:
  // bottom right from 3/4 turn, top right from 0, top left from 1/4, bottom left from 1/2.
  const corners: readonly (readonly [number, number, number])[] = [
    [ex, -ey, 3 * quarter],
    [ex, ey, 0],
    [-ex, ey, quarter],
    [-ex, -ey, 2 * quarter],
  ];
  const out: Vec2[] = [];
  for (const [ox, oy, i0] of corners) {
    for (let i = 0; i <= quarter; i++) {
      const [c, s] = unitCircle(i0 + i, n);
      const p: Vec2 = [r.cx + ox + r.rc * c, r.cy + oy + r.rc * s];
      const last = out[out.length - 1];
      if (last !== undefined && Math.hypot(last[0] - p[0], last[1] - p[1]) < 1e-12) continue;
      out.push(p);
    }
  }
  const first = out[0]!;
  const last = out[out.length - 1]!;
  if (out.length > 1 && Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-12) out.pop();
  return out;
}
