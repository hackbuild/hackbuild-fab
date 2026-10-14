// Part-in-part (M07-T05, D-137): small parts nest inside the holes of large
// parts. No legacy design packed into holes (jagua-rs 1.0.0 rejects item
// holes, research/code-cad-and-eda-tooling.md section 5.4), so this pass is
// nest's own and has no lineage row; it reuses the MaxRects free-rectangle
// kernel of maxrects.ts and the ring classification of profile.ts.
//
// The pass runs per sheet group, before the sheet packer, in the frame of
// each root part (its rings at turn 0 with the bbox minimum corner at the
// origin), which is the frame the root keeps once the packer places it:
//   1. Copies go largest footprint first (a stable sort). Each copy tries
//      the open containers; if none takes it, it is a root and goes to the
//      sheet packer.
//   2. After a copy is placed (as a root, or inside a container), each of
//      its holes whose area exceeds the smallest footprint still to come
//      becomes a container: the hole region, less any island inside it,
//      offset inward by gap/2 (round joins, the exact erosion).
//   3. Candidate rectangles in a container come from MaxRects seeded with
//      the container's bounding box, every footprint grown by the gap as in
//      the sheet packer. Candidates are tried best short side first; one is
//      accepted only when the copy's outer ring offset by gap/2 (miter
//      joins, a superset of the round offset) lies inside the container
//      polygon: the difference has area at most 1e-6 mm2.
//   4. An inner part turns with its root, so its turn relative to the root
//      is one that keeps every allowed root turn legal: (R + r) mod 360 is
//      allowed for every allowed R. With rotations [0, 90] that is 0 only;
//      with all four quarter turns, any.
// A root that MaxRects would list oversize (larger than the sheet less two
// margins and two gaps in every allowed turn) hosts nothing, so an inner
// part is never lost with an oversize host.

import { commandError, type NestItem, type Placement, type QuarterTurn, type Ring, type Vec2 } from "@hackbuild/spec";
import { ringArea2, type Geom, type Section } from "@hackbuild/geom";
import { extentOf, placeRings, turnsOf, type Box, type Frame } from "./box.js";
import { splitFree, type Rect } from "./maxrects.js";
import { classifyRings, OFFSET_MITER_LIMIT, partProfile } from "./profile.js";

/** Largest area of the inner outline grown by gap/2 left outside its container, mm2 (M07-T05 step 2). */
export const CONTAIN_TOLERANCE = 1e-6;

/** A copy placed inside a hole, in its root's frame. */
export interface Inner {
  readonly id: string;
  readonly copy: number;
  /** Unturned bbox of the copy, mm. */
  readonly w: number;
  /** mm */
  readonly h: number;
  /** Bbox minimum corner after the turn, in the root's frame, mm. */
  readonly at: Vec2;
  /** Turn relative to the root. */
  readonly rot: QuarterTurn;
  /** The part whose hole holds this copy. */
  readonly host: { readonly id: string; readonly copy: number };
}

/** One group after the pass: the roots the sheet packer places, and what each holds. */
export interface Nesting {
  readonly roots: readonly Box[];
  /** Inner copies by root key (keyOf), in the order they were placed. */
  readonly inners: ReadonlyMap<string, readonly Inner[]>;
}

interface Container {
  /** Key of the root whose frame this container is in. */
  readonly root: string;
  readonly host: { readonly id: string; readonly copy: number };
  readonly region: Section;
  free: Rect[];
}

export const keyOf = (id: string, copy: number): string => `${id}\u0000${copy}`;

const TURNS: readonly QuarterTurn[] = [0, 90, 180, 270];

/** Turns of an inner relative to its root that keep every allowed root turn legal (rule 4). */
export function innerTurns(rotations: readonly QuarterTurn[]): QuarterTurn[] {
  return TURNS.filter((r) => rotations.every((R) => rotations.includes(((R + r) % 360) as QuarterTurn)));
}

/** The largest ring by area, the outer (cutfiles.py polygon_from_rings rule, profile.ts). */
function outerOf(rings: readonly Ring[]): Ring {
  let best = rings[0]!, a = -1;
  for (const r of rings) {
    const v = Math.abs(ringArea2(r));
    if (v > a) {
      a = v;
      best = r;
    }
  }
  return best;
}

/** Holes of placed rings larger than `minArea`, as containers in the root frame (rule 2). */
function containersOf(geom: Geom, placed: readonly Ring[], minArea: number, gap: number, root: string, host: Container["host"]): Container[] {
  const holes = classifyRings(placed).filter((c) => c.depth % 2 === 1 && c.area > minArea);
  if (holes.length === 0) return [];
  const solid = partProfile(geom, placed).section;
  const out: Container[] = [];
  for (const h of holes) {
    const region = geom.fromOutline(h.ring).difference(solid).offset(-gap / 2, { join: "Round" });
    const b = region.bounds();
    if (b === null) continue;
    out.push({ root, host, region, free: [{ x: b.min[0], y: b.min[1], w: b.max[0] - b.min[0], h: b.max[1] - b.min[1] }] });
  }
  return out;
}

/**
 * Assign copies to holes for one sheet group. `boxes` are the group's
 * copies; `ringsOf` gives an item's rings by id. Returns the roots for the
 * sheet packer and the inner copies each root carries.
 */
export function nestHoles(geom: Geom, boxes: readonly Box[], ringsOf: (id: string) => readonly Ring[], frame: Frame): Nesting {
  const { gap, margin, rotations } = frame;
  const [W, H] = frame.sheet;
  const hostW = W - 2 * margin - 2 * gap, hostH = H - 2 * margin - 2 * gap;
  const rel = innerTurns(rotations);
  const order = boxes.slice().sort((a, b) => b.w * b.h - a.w * a.h);
  // smallest footprint at or after each index, mm2
  const tail: number[] = new Array<number>(order.length + 1).fill(Infinity);
  for (let k = order.length - 1; k >= 0; k--) tail[k] = Math.min(tail[k + 1]!, order[k]!.w * order[k]!.h);

  const roots: Box[] = [];
  const inners = new Map<string, Inner[]>();
  const containers: Container[] = [];
  order.forEach((box, k) => {
    const rings = ringsOf(box.id);
    const minArea = tail[k + 1]!;
    const placed = rel.length === 0 ? null : placeInside(geom, box, rings, containers, rel, gap);
    if (placed !== null) {
      const { container, at, rot, fit } = placed;
      container.free = splitFree(container.free, fit);
      const inner: Inner = { id: box.id, copy: box.copy, w: box.w, h: box.h, at, rot, host: container.host };
      inners.get(container.root)!.push(inner);
      if (minArea < Infinity) containers.push(...containersOf(geom, placeRings(rings, at, rot), minArea, gap, container.root, { id: box.id, copy: box.copy }));
      return;
    }
    roots.push(box);
    const key = keyOf(box.id, box.copy);
    inners.set(key, []);
    const hosts = turnsOf(box, rotations).some((t) => t.w <= hostW && t.h <= hostH);
    if (hosts && minArea < Infinity) containers.push(...containersOf(geom, placeRings(rings, [0, 0], 0), minArea, gap, key, { id: box.id, copy: box.copy }));
  });
  return { roots, inners };
}

interface Inside {
  readonly container: Container;
  readonly at: Vec2;
  readonly rot: QuarterTurn;
  /** The grown footprint taken from the container's free rectangles. */
  readonly fit: Rect;
}

/** Best short side fit over every container's free rectangles, then the polygon test (rule 3). */
function placeInside(geom: Geom, box: Box, rings: readonly Ring[], containers: readonly Container[], rel: readonly QuarterTurn[], gap: number): Inside | null {
  const turns = turnsOf(box, rel).map((t) => ({ w: t.w + gap, h: t.h + gap, rot: t.rot }));
  const cands: { c: number; f: Rect; t: (typeof turns)[number]; s: number; l: number; n: number }[] = [];
  containers.forEach((ct, c) => {
    for (const f of ct.free) {
      for (const t of turns) {
        if (t.w > f.w || t.h > f.h) continue;
        cands.push({ c, f, t, s: Math.min(f.w - t.w, f.h - t.h), l: Math.max(f.w - t.w, f.h - t.h), n: cands.length });
      }
    }
  });
  if (cands.length === 0) return null;
  cands.sort((a, b) => a.s - b.s || a.l - b.l || a.n - b.n);
  const outer = outerOf(rings);
  for (const k of cands) {
    const at: Vec2 = [k.f.x + gap / 2, k.f.y + gap / 2];
    const container = containers[k.c]!;
    const [ring] = placeRings([outer], shift(rings, outer, at, k.t.rot), k.t.rot);
    const grown = geom.fromOutline(ring!).offset(gap / 2, { join: "Miter", miterLimit: OFFSET_MITER_LIMIT });
    if (grown.difference(container.region).area() <= CONTAIN_TOLERANCE) {
      return { container, at, rot: k.t.rot, fit: { x: k.f.x, y: k.f.y, w: k.t.w, h: k.t.h } };
    }
  }
  return null;
}

/**
 * placeRings puts the bbox minimum corner of the rings it is given at `at`;
 * the outer ring alone may have a smaller bbox than all the rings (a hole
 * ring never pokes out, but a stray ring can), so place the outer where it
 * sits when the whole part's corner is at `at`.
 */
function shift(rings: readonly Ring[], outer: Ring, at: Vec2, rot: QuarterTurn): Vec2 {
  const all = extentOf(rings), o = extentOf([outer]);
  const [u0, v0, u1, v1] = [o.x0 - all.x0, o.y0 - all.y0, o.x0 - all.x0 + o.w, o.y0 - all.y0 + o.h];
  const pts = turnCorner(all.w, all.h, rot, [[u0, v0], [u1, v1]]);
  return [at[0] + Math.min(pts[0]![0], pts[1]![0]), at[1] + Math.min(pts[0]![1], pts[1]![1])];
}

/** Points relative to an unturned w x h bbox corner, after the turn (box.ts placeRings rule). */
function turnCorner(w: number, h: number, rot: QuarterTurn, pts: readonly Vec2[]): Vec2[] {
  return pts.map(([u, v]): Vec2 => {
    if (rot === 90) return [h - v, u];
    if (rot === 180) return [w - u, h - v];
    if (rot === 270) return [v, w - u];
    return [u, v];
  });
}

/**
 * The sheet placement of an inner copy whose root sits at `rootAt` with
 * turn `rootRot`: the turns add, and the corner is the minimum of the
 * inner's rectangle carried through the root's turn.
 */
export function composePlacement(root: Box, sheet: number, rootAt: Vec2, rootRot: QuarterTurn, inner: Inner): Placement {
  const iw = inner.rot === 90 || inner.rot === 270 ? inner.h : inner.w;
  const ih = inner.rot === 90 || inner.rot === 270 ? inner.w : inner.h;
  const [a, b] = turnCorner(root.w, root.h, rootRot, [inner.at, [inner.at[0] + iw, inner.at[1] + ih]]);
  return {
    id: inner.id, copy: inner.copy, sheet,
    at: [rootAt[0] + Math.min(a![0], b![0]), rootAt[1] + Math.min(a![1], b![1])],
    rot: ((rootRot + inner.rot) % 360) as QuarterTurn,
    inside: inner.host,
  };
}

/**
 * Cut order for a sheet's placements: every part inside a hole comes before
 * its host, deepest first, so the cutter frees an inner part before it cuts
 * the outline around it (M07-T05 step 3; the DXF writer of M07-T06 emits in
 * this order). Hosts keep their input order.
 */
export function cutOrder(placements: readonly Placement[]): Placement[] {
  const kids = new Map<string, Placement[]>();
  for (const p of placements) {
    if (p.inside === undefined) continue;
    const k = keyOf(p.inside.id, p.inside.copy);
    kids.set(k, [...(kids.get(k) ?? []), p]);
  }
  const out: Placement[] = [];
  const visit = (p: Placement): void => {
    for (const c of kids.get(keyOf(p.id, p.copy)) ?? []) visit(c);
    out.push(p);
  };
  for (const p of placements) if (p.inside === undefined) visit(p);
  if (out.length !== placements.length) {
    throw commandError({ code: "E_SCHEMA", path: "/placements", got: placements.length, expected: "every inside naming a placed host", hint: "place each host before naming it in inside" });
  }
  return out;
}

/** Item rings by id for one request. */
export const ringsById = (items: readonly NestItem[]): ((id: string) => readonly Ring[]) => {
  const m = new Map(items.map((it) => [it.id, it.rings] as const));
  return (id) => m.get(id)!;
};
