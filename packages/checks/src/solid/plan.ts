// Plan (2D) measures over declared outlines: the bridging span across an
// opening, the depth of a point inside a region, and the width of a region
// as islands.py measures it (twice the largest inset that leaves it
// non-empty). Rings are mm; outer rings and holes pool under the even-odd
// rule, as geom fillPolygonEvenOdd fills them (SPRUE S.fromPolygon).

import type { Ring, Vec2 } from "@hackbuild/spec";
import { fillPolygonEvenOdd } from "@hackbuild/geom";
import { longestBridge } from "./layers.js";
import type { Grid } from "./slice.js";
import { closestEdges, inside, ringEdges } from "../skeleton/plan.js";

/** A grid over rings with pad empty cells each side. */
export function gridOverRings(rings: readonly Ring[], h: number, pad = 3): Grid {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const nx = Math.max(1, Math.ceil((x1 - x0) / h)) + 2 * pad;
  const ny = Math.max(1, Math.ceil((y1 - y0) / h)) + 2 * pad;
  return { x0: x0 - pad * h, y0: y0 - pad * h, h, nx, ny };
}

/** Cells of the grid inside the rings (even-odd), row j holding cells j * nx onward. */
export function fillRings(rings: readonly Ring[], g: Grid): Uint8Array {
  // fillPolygonEvenOdd centres its grid on the origin; shift the rings into that frame.
  const cx = g.x0 + (g.nx * g.h) / 2, cy = g.y0 + (g.ny * g.h) / 2;
  const moved = rings.map((r) => r.map(([x, y]) => [x - cx, y - cy] as const));
  return fillPolygonEvenOdd({ w: g.nx, h: g.ny, res: 1 / g.h }, moved, "bottom");
}

/**
 * The longest unsupported span across an opening that a layer above bridges:
 * the material of the layer covers the whole grid, and support lies outside
 * the opening. A 3.6 mm round hole reads 3.6.
 */
export function openingSpan(rings: readonly Ring[], h: number): { readonly spanMm: number; readonly at: readonly [number, number] } | null {
  const g = gridOverRings(rings, h);
  const hole = fillRings(rings, g);
  const cur = new Uint8Array(hole.length).fill(1);
  const prev = hole.map((v) => (v === 1 ? 0 : 1));
  return longestBridge(cur, prev, g);
}

/** Signed distance of p into the region, mm: positive inside, negative outside, edge to point. */
export function depthInside(p: Vec2, rings: readonly Ring[]): number {
  const inRegion = rings.reduce((acc, r) => (inside(p, r) ? !acc : acc), false);
  const edges = rings.flatMap(ringEdges);
  const d = closestEdges([[p, p]], edges).d;
  return inRegion ? d : -d;
}

/** Edge-level distance between two regions, mm; 0 when they touch or overlap. */
export function regionGap(a: readonly Ring[], b: readonly Ring[]): number {
  const overlap = a.some((r) => r.some((p) => b.reduce((acc, s) => (inside(p, s) ? !acc : acc), false)))
    || b.some((r) => r.some((p) => a.reduce((acc, s) => (inside(p, s) ? !acc : acc), false)));
  if (overlap) return 0;
  return closestEdges(a.flatMap(ringEdges), b.flatMap(ringEdges)).d;
}

/**
 * A region's width as islands.py measures it, twice the largest round inset
 * that leaves it non-empty, mm: twice the largest distance from a set
 * cell's centre to the edge of the nearest unset cell. A strip k cells wide
 * reads k cells; an empty mask reads 0.
 */
export function regionWidth(mask: Uint8Array, g: Grid): number {
  const ins: number[] = [];
  const outs: number[] = [];
  for (let c = 0; c < mask.length; c++) (mask[c] === 1 ? ins : outs).push(c);
  if (ins.length === 0) return 0;
  const xy = (c: number): readonly [number, number] => [c % g.nx, Math.floor(c / g.nx)];
  // Unset cells that border a set cell are the only ones a nearest search needs.
  const edge = outs.filter((c) => {
    const [i, j] = xy(c);
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => {
      const ii = i + di!, jj = j + dj!;
      return ii >= 0 && jj >= 0 && ii < g.nx && jj < g.ny && mask[jj * g.nx + ii] === 1;
    });
  }).map(xy);
  let best = 0;
  for (const c of ins) {
    const [i, j] = xy(c);
    let d = Infinity;
    for (const [oi, oj] of edge) d = Math.min(d, Math.hypot(oi - i, oj - j));
    best = Math.max(best, d);
  }
  return 2 * (best - 0.5) * g.h;
}
