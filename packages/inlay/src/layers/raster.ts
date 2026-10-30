// Cell-centre painting helpers for the BAIL layer kinds (shape, scope,
// circuit). BAIL paints these on a canvas (bail.html:1349 to 1496,
// shapePath and paintLayer) and reads alpha above 127; here the same shapes
// are tested at cell centres, so a layer renders the same in node and in
// the browser and needs no Surface. Coordinates are model mm, y up, origin
// at the grid centre; row 0 of a mask is the bottom row, the order of the
// inlay label grids and of readMask (surface.ts).
//
// A canvas cell is painted when its coverage passes one half; a cell-centre
// test agrees with that wherever an edge is straight and differs by at most
// the cells an edge crosses where it is curved (test/bail-canvas.test.ts
// counts them against BAIL's own canvas).

import type { RasterGrid } from "../surface.js";

export type Pt = readonly [number, number];

/** Where a layer sits: translate (dx, dy) mm, then rotate rot degrees counter-clockwise (bail.html:1411). */
export interface Placement {
  readonly dx: number;
  readonly dy: number;
  readonly rot: number;
}

export interface Frame {
  readonly c: number;
  readonly s: number;
  readonly dx: number;
  readonly dy: number;
}

export function frameOf(p: Placement): Frame {
  const r = ((p.rot || 0) * Math.PI) / 180;
  return { c: Math.cos(r), s: Math.sin(r), dx: p.dx || 0, dy: p.dy || 0 };
}

/** Layer-local point to model mm. */
export function toModel(f: Frame, [x, y]: Pt): Pt {
  return [f.dx + f.c * x - f.s * y, f.dy + f.s * x + f.c * y];
}

/** Model point to layer-local. */
export function toLocal(f: Frame, x: number, y: number): Pt {
  const ax = x - f.dx, ay = y - f.dy;
  return [f.c * ax + f.s * ay, -f.s * ax + f.c * ay];
}

export const newMask = (g: RasterGrid): Uint8Array => new Uint8Array(g.w * g.h);

/** Every cell whose centre passes `inside` in layer-local coordinates is set. */
export function fillLocal(mask: Uint8Array, g: RasterGrid, f: Frame, inside: (x: number, y: number) => boolean): void {
  const { w, h, res } = g;
  for (let j = 0; j < h; j++) {
    const y = (j + 0.5 - h / 2) / res;
    for (let i = 0; i < w; i++) {
      const x = (i + 0.5 - w / 2) / res;
      const [lx, ly] = toLocal(f, x, y);
      if (inside(lx, ly)) mask[j * w + i] = 1;
    }
  }
}

/**
 * Fill polygons given in model mm into `mask` under one rule. "evenodd"
 * toggles at every crossing; "nonzero" adds each polygon's winding, so
 * overlapping polygons of opposite orientation cancel as a canvas path with
 * several subpaths cancels them (BAIL's arrow, bail.html:1397 to 1404). A
 * cell centre exactly on a horizontal edge counts with the half-open rule
 * a.y <= y < b.y, the rule geom fillPolygonEvenOdd uses (SPRUE's).
 */
export function fillPolygons(mask: Uint8Array, g: RasterGrid, polys: readonly (readonly Pt[])[], rule: "evenodd" | "nonzero"): void {
  const { w, h, res } = g;
  let y0 = Infinity, y1 = -Infinity;
  for (const poly of polys) for (const p of poly) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  if (!(y0 <= y1)) return;
  const j0 = Math.max(0, Math.floor(y0 * res + h / 2 - 0.5)), j1 = Math.min(h - 1, Math.ceil(y1 * res + h / 2 - 0.5));
  const xs: [number, number][] = [];
  for (let j = j0; j <= j1; j++) {
    const y = (j + 0.5 - h / 2) / res;
    xs.length = 0;
    for (const poly of polys) {
      const n = poly.length;
      if (n < 3) continue;
      for (let k = 0; k < n; k++) {
        const a = poly[k]!, b = poly[(k + 1) % n]!;
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push([a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), b[1] > a[1] ? 1 : -1]);
      }
    }
    xs.sort((p, q) => p[0] - q[0]);
    let wind = 0;
    for (let k = 0; k + 1 < xs.length; k++) {
      wind += rule === "evenodd" ? 1 : xs[k]![1];
      if (rule === "evenodd" ? wind % 2 === 0 : wind === 0) continue;
      const x0 = Math.max(0, Math.ceil(xs[k]![0] * res + w / 2 - 0.5));
      const x1 = Math.min(w - 1, Math.floor(xs[k + 1]![0] * res + w / 2 - 0.5));
      for (let i = x0; i <= x1; i++) mask[j * w + i] = 1;
    }
  }
}

/** One polygon, even-odd, added to `mask`. */
export const fillPolygon = (mask: Uint8Array, g: RasterGrid, poly: readonly Pt[]): void => fillPolygons(mask, g, [poly], "evenodd");

/** Cells whose centre lies within r mm of the segment a to b: a capsule, which is a round-capped, round-joined stroke of width 2 r. */
export function strokeCapsule(mask: Uint8Array, g: RasterGrid, a: Pt, b: Pt, r: number): void {
  const { w, h, res } = g;
  const x0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r) * res + w / 2 - 0.5));
  const x1 = Math.min(w - 1, Math.ceil((Math.max(a[0], b[0]) + r) * res + w / 2 - 0.5));
  const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r) * res + h / 2 - 0.5));
  const j1 = Math.min(h - 1, Math.ceil((Math.max(a[1], b[1]) + r) * res + h / 2 - 0.5));
  const vx = b[0] - a[0], vy = b[1] - a[1], len2 = vx * vx + vy * vy, r2 = r * r;
  for (let j = j0; j <= j1; j++) {
    const y = (j + 0.5 - h / 2) / res;
    for (let i = x0; i <= x1; i++) {
      const x = (i + 0.5 - w / 2) / res;
      let t = len2 === 0 ? 0 : ((x - a[0]) * vx + (y - a[1]) * vy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = x - (a[0] + t * vx), dy = y - (a[1] + t * vy);
      if (dx * dx + dy * dy <= r2) mask[j * w + i] = 1;
    }
  }
}

/** A polyline stroked with round caps and joins (canvas lineCap and lineJoin round). */
export function strokeRound(mask: Uint8Array, g: RasterGrid, pts: readonly Pt[], width: number, closed = false): void {
  const hw = width / 2;
  if (pts.length === 1) { strokeCapsule(mask, g, pts[0]!, pts[0]!, hw); return; }
  for (let k = 0; k + 1 < pts.length; k++) strokeCapsule(mask, g, pts[k]!, pts[k + 1]!, hw);
  if (closed && pts.length > 2) strokeCapsule(mask, g, pts[pts.length - 1]!, pts[0]!, hw);
}

/** Canvas miterLimit default (and the value bail.html:1387 sets): a join sharper than this ratio is cut square. */
export const MITER_LIMIT = 10;

/**
 * A polyline stroked with butt caps and miter joins as convex pieces: one
 * rectangle per segment and one wedge per join on the outer side. Where the
 * miter ratio 1 / sin(angle / 2) passes the limit the join is a bevel, as
 * the canvas cuts it. Zero-length segments are dropped.
 */
export function miterPieces(pts: readonly Pt[], width: number, closed: boolean, limit: number = MITER_LIMIT): Pt[][] {
  const hw = width / 2;
  const P = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]) > 1e-12);
  if (closed && P.length > 1 && Math.hypot(P[0]![0] - P[P.length - 1]![0], P[0]![1] - P[P.length - 1]![1]) <= 1e-12) P.pop();
  const m = P.length;
  const segs = closed ? m : m - 1;
  const out: Pt[][] = [];
  const dir = (k: number): Pt => {
    const a = P[k]!, b = P[(k + 1) % m]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  for (let k = 0; k < segs; k++) {
    const a = P[k]!, b = P[(k + 1) % m]!, d = dir(k), nx = -d[1] * hw, ny = d[0] * hw;
    out.push([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]);
  }
  const joins = closed ? m : m - 2;
  for (let q = 0; q < joins; q++) {
    const k = closed ? q : q + 1;
    const v = P[k]!, d1 = dir((k - 1 + m) % m), d2 = dir(k % m);
    const cross = d1[0] * d2[1] - d1[1] * d2[0], dot = d1[0] * d2[0] + d1[1] * d2[1];
    if (Math.abs(cross) < 1e-12) continue;
    // The outer side of a left turn is the right: normals (dy, -dx); of a right turn the left: (-dy, dx).
    const sgn = cross > 0 ? 1 : -1;
    const n1: Pt = [sgn * d1[1], -sgn * d1[0]], n2: Pt = [sgn * d2[1], -sgn * d2[0]];
    const A: Pt = [v[0] + hw * n1[0], v[1] + hw * n1[1]], B: Pt = [v[0] + hw * n2[0], v[1] + hw * n2[1]];
    const ratio = Math.sqrt(2 / (1 + dot));
    if (ratio <= limit) {
      const k2 = hw / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
      out.push([v, A, [v[0] + k2 * (n1[0] + n2[0]), v[1] + k2 * (n1[1] + n2[1])], B]);
    } else out.push([v, A, B]);
  }
  return out;
}
