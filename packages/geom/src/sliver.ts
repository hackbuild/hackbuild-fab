// Sliver report. A region narrower than the minimum feature width cannot be
// printed as drawn: 0.6 mm for a 0.4 nozzle, constant geom.sliverMin.n04,
// tier inferred (demo_coin.py header, M00-T02 step 9). The narrow parts are
// what a morphological opening removes: inset by half the width, outset
// back, and subtract from the original. Miter joins keep sharp convex
// corners, so a corner alone is never reported as a sliver.

import type { Mm, Vec2 } from "@hackbuild/spec";
import type { Bounds, Section } from "./cs.js";
import { constantMm, GEOM_CONSTANTS, type ConstantSource } from "./inset.js";

export interface Sliver {
  /** Centroid of the narrow piece, mm. */
  readonly at: Vec2;
  readonly bounds: Bounds;
  /** Area of the narrow piece, mm2 (computed). */
  readonly area: number;
  /** Minimum feature width the piece is narrower than, mm. */
  readonly legal: Mm;
  /** Profile constant that set the width. */
  readonly constraint: string;
}

/** Miter limit for the opening, as a multiple of the offset; high so acute corners come back whole. */
const OPENING_MITER_LIMIT = 1000;

/**
 * Pieces of cs narrower than the minimum feature width, each with its
 * location. Pieces under minArea mm2 are offset round-off and are dropped;
 * the default is (width / 100)^2 (computed).
 */
export function slivers(cs: Section, profile: ConstantSource, opts: { readonly constant?: string; readonly minArea?: number } = {}): Sliver[] {
  const constraint = opts.constant ?? GEOM_CONSTANTS.sliverMin;
  const width = constantMm(profile, constraint);
  const minArea = opts.minArea ?? (width / 100) ** 2;
  const half = width / 2;
  const miter = { join: "Miter" as const, miterLimit: OPENING_MITER_LIMIT };
  const opened = cs.offset(-half, miter).offset(half, miter);
  const lost = cs.difference(opened);
  const out: Sliver[] = [];
  for (const piece of lost.components({ snap: false })) {
    let a2 = 0;
    let cx = 0;
    let cy = 0;
    for (const ring of [piece.outer, ...piece.holes]) {
      for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        const [x0, y0] = ring[j]!;
        const [x1, y1] = ring[i]!;
        const cr = x0 * y1 - x1 * y0;
        a2 += cr;
        cx += (x0 + x1) * cr;
        cy += (y0 + y1) * cr;
      }
    }
    const area = a2 / 2;
    if (area < minArea) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of piece.outer) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    out.push({ at: [cx / (3 * a2), cy / (3 * a2)], bounds: { min: [minX, minY], max: [maxX, maxY] }, area, legal: width, constraint });
  }
  return out;
}
