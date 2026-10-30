// Scope layers: a Lissajous trace x = w/2 sin(a u + phase), y = h/2 sin(b u)
// for u over one turn, stroked with round caps and joins (bail.html:1457 to
// 1462, paintLayer scope branch, lineage bail.bench/inlay-scope). The
// polyline has 1600 segments, BAIL's N.

import type { LayerResult, RasterGrid } from "../surface.js";
import { frameOf, newMask, strokeRound, toModel, type Pt } from "./raster.js";

export interface ScopeLayer {
  kind: "scope";
  /** x frequency, whole number of cycles per turn */
  a: number;
  /** y frequency */
  b: number;
  /** degrees, phase of x */
  phase: number;
  /** mm, extent across */
  w: number;
  /** mm, extent up */
  h: number;
  /** mm, trace width */
  t: number;
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

/** Segments in the trace (bail.html:1458, `N = 1600`). */
export const SCOPE_SEGMENTS = 1600;

/** The trace in layer-local mm, SCOPE_SEGMENTS + 1 points, the last equal to the first up to rounding. */
export function scopePoints(L: Pick<ScopeLayer, "a" | "b" | "phase" | "w" | "h">): Pt[] {
  const ph = ((L.phase || 0) * Math.PI) / 180;
  const out: Pt[] = [];
  for (let k = 0; k <= SCOPE_SEGMENTS; k++) {
    const u = (k / SCOPE_SEGMENTS) * Math.PI * 2;
    out.push([(L.w / 2) * Math.sin(L.a * u + ph), (L.h / 2) * Math.sin(L.b * u)]);
  }
  return out;
}

export function scopeMask(L: ScopeLayer, grid: RasterGrid): Uint8Array {
  const f = frameOf(L);
  const mask = newMask(grid);
  strokeRound(mask, grid, scopePoints(L).map((p) => toModel(f, p)), L.t);
  return mask;
}

export function renderScope(L: ScopeLayer, grid: RasterGrid): LayerResult[] {
  return [{ mask: scopeMask(L, grid), slot: L.slot }];
}
