// Grid helpers of the negotiated router, ported from PIP (pip-controller at
// b137deb, lineage router/pip-controller-b137deb): the disc stencil
// (src/router.js lines 52 to 56), the static owner marks (lines 57 to 67) and
// the keep-in test PIP's layout hands its router as L.inside (src/layout.js
// lines 281 to 290). The keep-in arithmetic is PIP's, so the samples equal
// the ones recorded in packages/copper/test/fixtures/pip-b137deb-route.json.

import type { Ring } from "@hackbuild/spec";
import { pointInLoop, pointSegmentDistance } from "@hackbuild/geom";

/** Static cell codes: a net index k >= 0 owns the cell. */
export const FREE = -1;
export const BLOCKED = -2;
export const OUTSIDE = -3;

/** The route grid: cell (i, j) centre is (x0 + i gp, y0 + j gp); cell id j nx + i. */
export interface Grid {
  readonly x0: number;
  readonly y0: number;
  readonly nx: number;
  readonly ny: number;
  readonly gp: number;
}

/** Grid over the bounding box of the outline polygons, snapped down to gp (router.js lines 37 to 41). */
export function gridOf(outline: readonly Ring[], gp: number): Grid {
  let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9;
  for (const poly of outline) for (const [x, y] of poly) {
    xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
  }
  const x0 = Math.floor(xmin / gp) * gp, y0 = Math.floor(ymin / gp) * gp;
  const nx = Math.ceil((xmax - x0) / gp) + 1, ny = Math.ceil((ymax - y0) / gp) + 1;
  return { x0, y0, nx, ny, gp };
}

/**
 * True when (x, y) is inside the outline set by the even-odd rule and at
 * least m from every edge (layout.js lines 281 to 290).
 */
export function insideByMargin(outline: readonly Ring[], x: number, y: number, m: number): boolean {
  let ok = false;
  for (const poly of outline) if (pointInLoop([x, y], poly)) ok = !ok;
  if (!ok) return false;
  for (const poly of outline) for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, q = poly[(i + 1) % poly.length]!;
    if (pointSegmentDistance(x, y, a[0], a[1], q[0], q[1]) < m) return false;
  }
  return true;
}

/** Cell offsets strictly inside a disc of radius rmm (router.js lines 52 to 56). */
export function discStencil(rmm: number, gp: number): [number, number][] {
  const rc = rmm / gp, k = Math.ceil(rc), out: [number, number][] = [];
  for (let dj = -k; dj <= k; dj++) for (let di = -k; di <= k; di++) if (di * di + dj * dj < rc * rc) out.push([di, dj]);
  return out;
}

/**
 * Mark the cells within rmm of (x, y) as owned by `owner`; a cell another
 * net already owns becomes BLOCKED, and OUTSIDE cells stay outside
 * (router.js lines 57 to 67).
 */
export function markStatic(stat: Int16Array, g: Grid, x: number, y: number, rmm: number, owner: number): void {
  const { x0, y0, nx, ny, gp } = g;
  const rc = rmm / gp, k = Math.ceil(rc) + 1;
  const ic = (x - x0) / gp, jc = (y - y0) / gp;
  for (let j = Math.floor(jc - k); j <= Math.ceil(jc + k); j++) for (let i = Math.floor(ic - k); i <= Math.ceil(ic + k); i++) {
    if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
    if ((i - ic) ** 2 + (j - jc) ** 2 >= rc * rc) continue;
    const c = j * nx + i;
    if (stat[c] === OUTSIDE) continue;
    if (stat[c] === FREE) stat[c] = owner; else if (stat[c] !== owner) stat[c] = BLOCKED;
  }
}

/**
 * markStatic for a rectangular pad: the cells closer than dmm to the
 * rectangle of half extents (hx, hy) centred on (x, y), mm. PIP's posts
 * are discs; a BOSS pin pad is a square (boss.js lines 141 to 149 dilate
 * rectangles the same way).
 */
export function markStaticRect(stat: Int16Array, g: Grid, x: number, y: number, hx: number, hy: number, dmm: number, owner: number): void {
  const { x0, y0, nx, ny, gp } = g;
  const ic = (x - x0) / gp, jc = (y - y0) / gp;
  const kx = Math.ceil((hx + dmm) / gp) + 1, ky = Math.ceil((hy + dmm) / gp) + 1;
  for (let j = Math.floor(jc - ky); j <= Math.ceil(jc + ky); j++) for (let i = Math.floor(ic - kx); i <= Math.ceil(ic + kx); i++) {
    if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
    const dx = Math.max(Math.abs(x0 + i * gp - x) - hx, 0), dy = Math.max(Math.abs(y0 + j * gp - y) - hy, 0);
    if (dx * dx + dy * dy >= dmm * dmm) continue;
    const c = j * nx + i;
    if (stat[c] === OUTSIDE) continue;
    if (stat[c] === FREE) stat[c] = owner; else if (stat[c] !== owner) stat[c] = BLOCKED;
  }
}
