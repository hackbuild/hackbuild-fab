// Distance from a point to a closed segment, mm. The operand order is PIP's
// GEO.segDist (pip-controller src/geom.js lines 146 to 151, vendored in
// designs/pip/legacy/src/geom.js), so the copper router's keep-in samples
// equal the ones PIP's layout handed its router bit for bit.

/** Distance from (px, py) to the segment a to b; a zero-length segment is the distance to a. */
export function pointSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
