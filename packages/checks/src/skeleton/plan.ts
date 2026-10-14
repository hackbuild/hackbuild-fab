// Plan geometry for the skeleton checks: closest points between segments,
// conductor footprints from their declarations, and edge-level distance
// between footprints (CHK-NET-02 origin TANG 2026-08: a vertex test missed a
// triangle edge crossing, so every distance here is segment to segment).
// The skeleton reads horizontal +z faces only; other faces arrive with the
// M05 conductor kinds.

import type { ConductorFeature, FaceFrame, Mm, Ring, Vec2, Vec3 } from "@hackbuild/spec";
import { faceBasis, horizontalFrame, placeOnFace } from "@hackbuild/geom";
import { checkError } from "./common.js";

export interface Closest {
  /** Distance between p and q, mm. */
  readonly d: Mm;
  readonly p: Vec2;
  readonly q: Vec2;
}

function closestOnSeg(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return [a[0] + t * dx, a[1] + t * dy];
}

const cross = (o: Vec2, a: Vec2, b: Vec2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Closest points between segments ab and cd; a proper crossing returns distance 0 at the crossing. */
export function segSeg(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Closest {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    const t = d1 / (d1 - d2);
    const x: Vec2 = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    return { d: 0, p: x, q: x };
  }
  const cands: Closest[] = [
    { p: a, q: closestOnSeg(a, c, d) },
    { p: b, q: closestOnSeg(b, c, d) },
    { p: closestOnSeg(c, a, b), q: c },
    { p: closestOnSeg(d, a, b), q: d },
  ].map(({ p, q }) => ({ p, q, d: Math.hypot(q[0] - p[0], q[1] - p[1]) }));
  return cands.reduce((m, x) => (x.d < m.d ? x : m));
}

/** Even-odd point in ring. */
export function inside(p: Vec2, ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (a === undefined || b === undefined) continue;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

export const ringEdges = (ring: Ring): (readonly [Vec2, Vec2])[] =>
  ring.map((a, i) => [a, ring[(i + 1) % ring.length] ?? a] as const);

const polylineEdges = (pts: readonly Vec2[]): (readonly [Vec2, Vec2])[] =>
  pts.length === 1 && pts[0] !== undefined
    ? [[pts[0], pts[0]]]
    : pts.slice(1).map((b, i) => [pts[i] ?? b, b] as const);

/** Closest approach between two sets of segments. */
export function closestEdges(a: readonly (readonly [Vec2, Vec2])[], b: readonly (readonly [Vec2, Vec2])[]): Closest {
  let best: Closest = { d: Number.POSITIVE_INFINITY, p: [0, 0], q: [0, 0] };
  for (const [p0, p1] of a) {
    for (const [q0, q1] of b) {
      const c = segSeg(p0, p1, q0, q1);
      if (c.d < best.d) best = c;
    }
  }
  return best;
}

/** Face-frame point to part xy (geom faceBasis and placeOnFace); a non-unit frame is E_SCHEMA. */
export function toPart(face: FaceFrame, pt: Vec2, path = "/face"): Vec2 {
  const [x, y] = placeOnFace(faceBasis(face, path), pt);
  return [x, y];
}

/** Throws unless the face points up with u in the xy plane (geom horizontalFrame); returns its height. */
export function horizontal(face: FaceFrame, path: string): Mm {
  return horizontalFrame(face, path, {
    hint: "the skeleton checks read upward horizontal faces only; other faces arrive with the m05 kinds", record: "verification",
  }).z0 as Mm;
}

/** A conductor in plan: segments with a half width (0 for a filled region), the region ring, and its z range. */
export interface Footprint {
  readonly id: string;
  readonly net: string;
  readonly edges: readonly (readonly [Vec2, Vec2])[];
  readonly half: Mm;
  readonly ring?: Ring;
  readonly z: readonly [Mm, Mm];
}

export function footprint(f: ConductorFeature): Footprint {
  if ("meshHash" in f.region) {
    throw checkError({
      code: "E_KERNEL", path: `/features/${f.id}/region`, got: "meshHash", expected: "path or centreline",
      hint: "meshHash regions arrive with net extraction at m05; declare a path or a centreline", record: "verification",
    });
  }
  const face = f.region.face;
  const z0 = horizontal(face, `/features/${f.id}/region/face`);
  const z = [z0, z0 + f.t] as const;
  if ("centreline" in f.region) {
    const pts = f.region.centreline.map((p) => toPart(face, p));
    return { id: f.id, net: f.net, edges: polylineEdges(pts), half: f.width / 2, z };
  }
  const ring = f.region.path.map((p) => toPart(face, p));
  return { id: f.id, net: f.net, edges: ringEdges(ring), half: 0, ring, z };
}

/** Edge-level clearance between two footprints. */
export interface Clearance {
  /** 3D gap, mm; 0 or below when the footprints touch or overlap. */
  readonly gap: Mm;
  /** Gap in plan alone, mm. */
  readonly planGap: Mm;
  /** Vertical separation of the z ranges, mm; 0 when they overlap. */
  readonly zGap: Mm;
  /** World point in the middle of the gap, mm. */
  readonly at: Vec3;
}

export function clearance(a: Footprint, b: Footprint): Clearance {
  const zGap = Math.max(0, a.z[0] - b.z[1], b.z[0] - a.z[1]);
  const zMid = (Math.max(a.z[0], b.z[0]) + Math.min(a.z[1], b.z[1])) / 2;
  const inA = a.ring;
  const inB = b.ring;
  const contained = (inB !== undefined && a.edges.some(([p]) => inside(p, inB)))
    || (inA !== undefined && b.edges.some(([p]) => inside(p, inA)));
  const c = closestEdges(a.edges, b.edges);
  const planGap = contained ? -Math.min(a.half, b.half) : c.d - a.half - b.half;
  const t = c.d > 0 ? (a.half + Math.max(0, planGap) / 2) / c.d : 0;
  const at: Vec3 = [c.p[0] + t * (c.q[0] - c.p[0]), c.p[1] + t * (c.q[1] - c.p[1]), zMid];
  const gap = planGap <= 0 && zGap === 0 ? planGap : Math.hypot(Math.max(0, planGap), zGap);
  return { gap, planGap, zGap, at };
}
