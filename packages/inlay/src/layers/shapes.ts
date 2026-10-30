// Shape layers: the 13 shapes of BAIL's shapePath (bail.html:1349 to 1406,
// lineage bail.bench/inlay-shapes), painted into one slot. A shape is drawn
// in layer-local mm, y up, centred on the layer origin: w and h are its
// extent, t the stroke or gap, n a count (grid divisions, sun gaps, zigzag
// teeth, steps). The layer is then moved dx, dy mm and turned rot degrees
// counter-clockwise (bail.html:1411).
//
// BAIL fills each path on a canvas with the nonzero rule, and ring and frame
// even-odd. Polygon shapes here fill their subpaths together under the same
// rule, so overlapping subpaths of opposite orientation cancel as they do on
// the canvas.

import { ART_SHAPES, type ArtShape } from "@hackbuild/spec";
import type { LayerResult, RasterGrid } from "../surface.js";
import {
  fillLocal, fillPolygon, fillPolygons, frameOf, miterPieces, newMask, strokeCapsule, toModel,
  type Pt,
} from "./raster.js";

/** The 13 shape kinds, in the order of bail.html SHAPE_KINDS (line 1072); the list is spec/art.ts ART_SHAPES. */
export const SHAPE_KINDS = ART_SHAPES;
export type ShapeKind = ArtShape;

export interface ShapeLayer {
  kind: "shape";
  shape: ShapeKind;
  /** mm, extent across */
  w: number;
  /** mm, extent up */
  h: number;
  /** mm, stroke width, ring width or gap scale */
  t: number;
  /** count: grid divisions, sun gaps, zigzag teeth, steps; rounded, at least 1 */
  n: number;
  /** mm */
  dx: number;
  /** mm */
  dy: number;
  /** degrees counter-clockwise */
  rot: number;
  slot: number;
  cut?: boolean;
  off?: boolean;
}

const abs = Math.abs;

/** Mesa outline in unit coordinates, scaled by w and h (bail.html:1384). */
export const MESA_UNIT: readonly Pt[] = [[-0.5, -0.5], [-0.5, -0.18], [-0.43, -0.18], [-0.36, 0.24], [-0.13, 0.24], [-0.06, -0.06], [0.07, -0.06], [0.13, 0.45], [0.33, 0.45], [0.4, 0.02], [0.5, 0.02], [0.5, -0.5]];

/** The zigzag polyline (bail.html:1385 to 1388): 2 n + 1 points on two rails t / 2 inside the extent. */
export function zigzagPoints(w: number, h: number, t: number, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 2 * n; i++) out.push([-w / 2 + (i * w) / (2 * n), (i % 2 ? 1 : -1) * (h / 2 - t / 2)]);
  return out;
}

/** The stepped diamond outline, closed (bail.html:1389 to 1396): a quarter built from n steps, mirrored in y then x. */
export function stepsPoints(w: number, h: number, n: number): Pt[] {
  const q: Pt[] = [];
  const dx = w / 2 / n, dy = h / 2 / n;
  for (let i = 0; i < n; i++) {
    q.push([i * dx, h / 2 - i * dy]);
    q.push([(i + 1) * dx, h / 2 - i * dy]);
  }
  q.push([w / 2, 0]);
  const pts: Pt[] = q.concat(q.slice(0, -1).reverse().map(([x, y]): Pt => [x, -y]));
  return pts.concat(pts.slice(1, -1).reverse().map(([x, y]): Pt => [-x, y]));
}

/** The three chevron polygons (bail.html:1359). */
export function chevronPolygons(w: number, h: number, t: number): Pt[][] {
  const out: Pt[][] = [];
  for (let i = -1; i <= 1; i++) {
    const x = i * w * 0.4;
    out.push([[x - w * 0.16, -h / 2], [x, 0], [x - w * 0.16, h / 2], [x - w * 0.16 + t, h / 2], [x + t, 0], [x - w * 0.16 + t, -h / 2]]);
  }
  return out;
}

/** The arrow's polygons: shaft, head and two tail feathers (bail.html:1397 to 1404). */
export function arrowPolygons(w: number, h: number, t: number): Pt[][] {
  const hl = Math.min(w * 0.3, h * 1.2);
  const x0 = -w / 2 + h * 0.5, x1 = x0 + (w - hl - h * 0.5);
  const out: Pt[][] = [
    [[Math.min(x0, x1), -t / 2], [Math.max(x0, x1), -t / 2], [Math.max(x0, x1), t / 2], [Math.min(x0, x1), t / 2]],
    [[w / 2, 0], [w / 2 - hl, h / 2], [w / 2 - hl, -h / 2]],
  ];
  for (const s of [1, -1]) out.push([[-w / 2, (s * h) / 2], [-w / 2 + h * 0.5, (s * h) / 2], [-w / 2 + h * 0.95, 0], [-w / 2 + h * 0.45, 0]]);
  return out;
}

/** The saguaro's strokes: trunk and two arms (bail.html:1374 to 1383); round caps and joins. */
export function saguaroStrokes(w: number, h: number): { readonly width: number; readonly pts: readonly Pt[] }[] {
  const tw = w * 0.27, aw = w * 0.2;
  return [
    { width: tw, pts: [[0, -h / 2 + tw / 2], [0, h / 2 - tw / 2]] },
    { width: aw, pts: [[0, -0.1 * h], [-0.37 * w, -0.1 * h], [-0.37 * w, 0.17 * h]] },
    { width: aw, pts: [[0, 0.04 * h], [0.37 * w, 0.04 * h], [0.37 * w, 0.3 * h]] },
  ];
}

/** The sun's gap bands: y centre and height of band k (bail.html:1369 to 1371). */
export function sunBands(w: number, t: number, n: number): { readonly y: number; readonly g: number }[] {
  const out: { y: number; g: number }[] = [];
  for (let k = 0; k < n; k++) out.push({ y: (-w / 2 * (k + 1)) / (n + 1) + w * 0.04, g: t * (0.55 + (0.9 * k) / Math.max(1, n - 1)) });
  return out;
}

/** The cells of one shape layer, 0 or 1 per cell, row 0 at the bottom. */
export function shapeMask(L: ShapeLayer, grid: RasterGrid): Uint8Array {
  const { w, h, t } = L;
  const n = Math.max(1, Math.round(L.n || 1));
  const f = frameOf(L);
  const mask = newMask(grid);
  // One canvas path of several subpaths, filled nonzero (ctx.fill()): chevrons, arrow, mesa and the like.
  const polys = (list: readonly (readonly Pt[])[]): void => fillPolygons(mask, grid, list.map((p) => p.map((q) => toModel(f, q))), "nonzero");
  // Stroke pieces are a union, not one path: each piece fills alone.
  const pieces = (list: readonly (readonly Pt[])[]): void => { for (const p of list) fillPolygon(mask, grid, p.map((q) => toModel(f, q))); };
  const ellipse = (a: number, b: number) => (x: number, y: number): boolean => (x / a) ** 2 + (y / b) ** 2 <= 1;
  switch (L.shape) {
    case "rect":
      fillLocal(mask, grid, f, (x, y) => abs(x) <= w / 2 && abs(y) <= h / 2);
      break;
    case "ellipse":
      fillLocal(mask, grid, f, ellipse(w / 2, h / 2));
      break;
    case "ring": {
      // Two ellipses filled even-odd (bail.html:1356): the inner one is the hole.
      const o = ellipse(w / 2, h / 2), i = ellipse(Math.max(0.01, w / 2 - t), Math.max(0.01, h / 2 - t));
      fillLocal(mask, grid, f, (x, y) => o(x, y) !== i(x, y));
      break;
    }
    case "frame": {
      const hx = abs(w / 2 - t), hy = abs(h / 2 - t);
      fillLocal(mask, grid, f, (x, y) => (abs(x) <= w / 2 && abs(y) <= h / 2) !== (abs(x) <= hx && abs(y) <= hy));
      break;
    }
    case "diamond":
      fillLocal(mask, grid, f, (x, y) => abs(x) / (w / 2) + abs(y) / (h / 2) <= 1);
      break;
    case "chevrons":
      polys(chevronPolygons(w, h, t));
      break;
    case "grid": {
      // Scope graticule: n + 1 bars and round(n h / w) + 1 lines, each t wide and t longer than the frame (bail.html:1360 to 1366).
      const ny = Math.max(1, Math.round((n * h) / w));
      fillLocal(mask, grid, f, (x, y) => {
        if (abs(y) <= h / 2 + t / 2) for (let i = 0; i <= n; i++) if (abs(x - (-w / 2 + (i * w) / n)) <= t / 2) return true;
        if (abs(x) <= w / 2 + t / 2) for (let j = 0; j <= ny; j++) if (abs(y - (-h / 2 + (j * h) / ny)) <= t / 2) return true;
        return false;
      });
      break;
    }
    case "sun": {
      // A disc cut by gaps that thicken toward the horizon (bail.html:1367 to 1373).
      const bands = sunBands(w, t, n);
      fillLocal(mask, grid, f, (x, y) => {
        if (x * x + y * y > (w / 2) ** 2) return false;
        for (const b of bands) if (abs(x) <= w && abs(y - b.y) <= b.g / 2) return false;
        return true;
      });
      break;
    }
    case "saguaro": {
      for (const s of saguaroStrokes(w, h)) {
        const pts = s.pts.map((q) => toModel(f, q));
        for (let k = 0; k + 1 < pts.length; k++) strokeCapsule(mask, grid, pts[k]!, pts[k + 1]!, s.width / 2);
      }
      // The trunk base is cut square: a rectangle w * 0.27 wide and half that tall under the round cap.
      const tw = w * 0.27;
      pieces([[[-tw / 2, -h / 2], [tw / 2, -h / 2], [tw / 2, -h / 2 + tw / 2], [-tw / 2, -h / 2 + tw / 2]]]);
      break;
    }
    case "mesa":
      polys([MESA_UNIT.map(([x, y]): Pt => [x * w, y * h])]);
      break;
    case "zigzag":
      pieces(miterPieces(zigzagPoints(w, h, t, n), t, false));
      break;
    case "steps":
      pieces(miterPieces(stepsPoints(w, h, n), t, true));
      break;
    case "arrow":
      polys(arrowPolygons(w, h, t));
      break;
  }
  return mask;
}

export function renderShape(L: ShapeLayer, grid: RasterGrid): LayerResult[] {
  return [{ mask: shapeMask(L, grid), slot: L.slot }];
}
