// The dyadic vertex snap (D-054), ported from COTTER GEO.q
// (x/cotter-src/src/geo.js line 28). Values on the 1/1024 mm grid add and
// subtract exactly in float64 and survive the float32 of an STL or 3MF up
// to 2^24 / 1024 = 16384 mm (computed), so faces meant to be coplanar stay
// exactly coplanar. A nudge applied anywhere must exceed the downstream
// weld: a 0.2 micron nudge under a 1e-4 weld recreated non-manifold edges
// on CASK (plan-deltas R51).

import type { Mm, Ring, Vec2 } from "@hackbuild/spec";
import { MESH_GRID_PER_MM } from "@hackbuild/spec";

/** Grid step, mm: 1/1024 (D-054). */
export const GRID: Mm = 1 / MESH_GRID_PER_MM;

/** Largest magnitude whose grid values are exact in float32, mm: 2^24 / 1024 (computed). */
export const FLOAT32_EXACT_LIMIT: Mm = 2 ** 24 / MESH_GRID_PER_MM;

/** Snap a length to the 1/1024 mm grid, mm. Negative zero comes back as zero so hashes see one value. */
export function q(v: Mm): Mm {
  const s = Math.round(v * MESH_GRID_PER_MM) / MESH_GRID_PER_MM;
  return s === 0 ? 0 : s;
}

/** True when v already sits on the grid. */
export function isSnapped(v: Mm): boolean {
  return q(v) === v;
}

export function snapPoint(p: Vec2): Vec2 {
  return [q(p[0]), q(p[1])];
}

export function snapRing(ring: Ring): Ring {
  return ring.map(snapPoint);
}
