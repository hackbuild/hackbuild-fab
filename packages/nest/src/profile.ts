// A part's cut profile as a geom Section, ported from OGEE16 cutfiles.py
// polygon_from_rings() (designs/ogee16/legacy/source/cutfiles.py lines 69 to
// 93; lineage ogee16.cutfiles/r16p) and compensate() (lines 95 to 97).
//
// polygon_from_rings sorts the rings by area, largest first, and makes a
// ring a hole of the first larger ring that contains its representative
// point. One change, written into the card (M07-T04 step 1): the original
// consumes a hole before it tests the rings inside it, so an island inside
// a hole comes back as a second hole of the outer. Here the ring's depth,
// the number of larger rings around its representative point, decides:
// even is solid (the outer, or an island in a hole), odd is a hole. Rings
// enter oriented by that depth under the Positive fill rule, so a hole
// ring that runs out through the outline cuts a notch, as the beam would.

import type { Ring, Vec2 } from "@hackbuild/spec";
import { ringArea2, type Geom, type Section } from "@hackbuild/geom";

/** One ring of a part and where it sits. */
export interface RingClass {
  readonly ring: Ring;
  /** Larger rings around the ring's representative point, count. */
  readonly depth: number;
  /** Absolute area, mm2. */
  readonly area: number;
}

/** The rings of one part, classified, and its region. */
export interface PartProfile {
  /** The rings in input order with their depth. */
  readonly rings: readonly RingClass[];
  /** Rings at odd depth, count. */
  readonly holes: number;
  /** Rings at even depth other than the largest ring, count: islands, and rings that lie outside the outer. */
  readonly solids: number;
  /** Rings other than the largest at depth 0, count: a cutout outside its outer (the SLUG record's holesOutsideOuter). */
  readonly outside: number;
  /** The region the rings bound, mm. */
  readonly section: Section;
}

function inRing(ring: Ring, x: number, y: number): boolean {
  let c = false;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/**
 * A point strictly inside a simple ring, as GEOS InteriorPointArea (behind
 * shapely representative_point) finds it: a scan line halfway between the
 * vertex heights nearest the bounding box centre on either side, and the
 * middle of the widest span the ring covers on that line.
 */
export function interiorPoint(ring: Ring): Vec2 {
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of ring) {
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const mid = (y0 + y1) / 2;
  let below = y0, above = y1;
  for (const [, y] of ring) {
    if (y <= mid && y > below) below = y;
    if (y > mid && y < above) above = y;
  }
  const y = (below + above) / 2;
  const xs: number[] = [];
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
  }
  xs.sort((a, b) => a - b);
  let best = -1, at = xs[0] ?? ring[0]![0];
  for (let k = 0; k + 1 < xs.length; k += 2) {
    const w = xs[k + 1]! - xs[k]!;
    if (w > best) {
      best = w;
      at = (xs[k]! + xs[k + 1]!) / 2;
    }
  }
  return [at, y];
}

/** Depth of every ring: larger rings around its representative point. Ties in area keep input order, the larger first. */
export function classifyRings(rings: readonly Ring[]): RingClass[] {
  const area = rings.map((r) => Math.abs(ringArea2(r)) / 2);
  const order = rings.map((_, i) => i).sort((a, b) => area[b]! - area[a]! || a - b);
  const rank = new Map(order.map((i, k) => [i, k]));
  return rings.map((ring, i) => {
    const [x, y] = interiorPoint(ring);
    let depth = 0;
    for (const j of order) {
      if (rank.get(j)! >= rank.get(i)!) break;
      if (inRing(rings[j]!, x, y)) depth++;
    }
    return { ring, depth, area: area[i]! };
  });
}

/** Build a part's region from its rings: even depth counter-clockwise, odd depth clockwise, Positive fill. */
export function partProfile(geom: Geom, rings: readonly Ring[]): PartProfile {
  const cls = classifyRings(rings);
  let largest = 0;
  cls.forEach((c, i) => {
    if (c.area > cls[largest]!.area) largest = i;
  });
  const oriented = cls.map((c) => {
    const ccw = ringArea2(c.ring) > 0;
    const hole = c.depth % 2 === 1;
    return ccw === hole ? [...c.ring].reverse() : c.ring;
  });
  const others = cls.filter((_, i) => i !== largest);
  return {
    rings: cls,
    holes: cls.filter((c) => c.depth % 2 === 1).length,
    solids: others.filter((c) => c.depth % 2 === 0).length,
    outside: others.filter((c) => c.depth === 0).length,
    section: geom.fromRings(oriented, { fillRule: "Positive" }),
  };
}

/** Miter limit of the kerf offset, a multiple of the offset: cutfiles.py compensate() line 97, mitre_limit=4.0. */
export const OFFSET_MITER_LIMIT = 4;

/**
 * Kerf compensation, cutfiles.py compensate(): the region grows by beam/2
 * with miter joins, so outlines grow and holes shrink and the finished part
 * comes out at the drawn size. A beam of 0 returns the region unchanged.
 */
export function compensate(section: Section, beam: number): Section {
  if (beam <= 0) return section;
  return section.offset(beam / 2, { join: "Miter", miterLimit: OFFSET_MITER_LIMIT });
}
