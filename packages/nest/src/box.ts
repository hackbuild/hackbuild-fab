// The footprint every packer sees: one copy of an item as the bounding box
// of all its rings, unrotated, and the turns the request allows. Packers
// return spots in sheet coordinates; the sheet loop turns them into spec
// Placements. Lengths in mm, Float64 throughout (M07-T03 step 7).

import type { QuarterTurn, Ring, Vec2 } from "@hackbuild/spec";

/** One copy of one item. */
export interface Box {
  readonly id: string;
  /** Copy index of the item, count from 0. */
  readonly copy: number;
  /** Bounding box width of all rings before any turn, mm. */
  readonly w: number;
  /** Bounding box height of all rings before any turn, mm. */
  readonly h: number;
}

/** A footprint after a quarter turn. */
export interface Turn {
  /** mm */
  readonly w: number;
  /** mm */
  readonly h: number;
  readonly rot: QuarterTurn;
}

/** A box placed by a packer: sheet index local to the packer's run, bbox minimum corner after the turn. */
export interface Spot {
  readonly box: Box;
  /** Sheet index within one packer run, count from 0. */
  readonly sheet: number;
  /** mm */
  readonly x: number;
  /** mm */
  readonly y: number;
  readonly rot: QuarterTurn;
}

/** The sheet a packer fills. */
export interface Frame {
  /** Sheet width and height, mm. */
  readonly sheet: Vec2;
  /** Edge margin, mm. */
  readonly margin: number;
  /** Gap between parts, mm. */
  readonly gap: number;
  /** Turns to try, in the order given. */
  readonly rotations: readonly QuarterTurn[];
}

export interface Packing {
  /** Sheets used, count. */
  readonly sheets: number;
  readonly spots: readonly Spot[];
  /** Boxes that fit the usable area in no allowed turn, in packing order. */
  readonly oversize: readonly Box[];
}

export type PackFn = (boxes: readonly Box[], frame: Frame) => Packing;

/** The footprint of each allowed turn, in request order; a half turn keeps w and h. */
export function turnsOf(box: Box, rotations: readonly QuarterTurn[]): Turn[] {
  return rotations.map((rot) => (rot === 90 || rot === 270 ? { w: box.h, h: box.w, rot } : { w: box.w, h: box.h, rot }));
}

/** Bounding box of all rings, mm. */
export function extentOf(rings: readonly Ring[]): { x0: number; y0: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * An item's rings on the sheet. A quarter turn is counter-clockwise about
 * the sheet normal, so with u, v measured from the bbox minimum corner a 90
 * deg turn maps (u, v) to (h - v, u), the SLUG placedLoops rule
 * (slug.html lines 1108 to 1113); 180 and 270 follow by repeating it. The result's
 * bbox minimum corner is `at`.
 */
export function placeRings(rings: readonly Ring[], at: Vec2, rot: QuarterTurn): Ring[] {
  const e = extentOf(rings);
  const [px, py] = at;
  return rings.map((ring) =>
    ring.map(([x, y]): Vec2 => {
      const u = x - e.x0, v = y - e.y0;
      if (rot === 90) return [px + e.h - v, py + u];
      if (rot === 180) return [px + e.w - u, py + e.h - v];
      if (rot === 270) return [px + v, py + e.w - u];
      return [px + u, py + v];
    }),
  );
}
