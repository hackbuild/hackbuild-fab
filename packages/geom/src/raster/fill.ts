// Even-odd scanline fill with pixel-centre sampling, ported from SPRUE
// S.fromPolygon (sprue.html lines 337 to 360, lineage
// sprue.bench/geom-raster-fill). SPRUE fills one ring; crossings from every
// ring are pooled here, so a ring inside another is a hole. One polygon in,
// SPRUE's cells out, row for row.

import type { Ring } from "@hackbuild/spec";

/** A cell grid centred on the origin: w by h cells at res cells per mm. */
export interface RasterGrid {
  readonly w: number;
  readonly h: number;
  /** cells per mm */
  readonly res: number;
}

/**
 * Which model row a grid row holds. "top": row 0 at the largest y, as SPRUE
 * stores masks. "bottom": row 0 at the smallest y, the order COLLAR's
 * readMask writes (collar.html:928 to 934) and the inlay label grids use.
 */
export type RowOrder = "top" | "bottom";

/**
 * Cells whose centre is inside the rings under the even-odd rule, 1 inside
 * and 0 outside. Ring vertices are mm, y up, origin at the grid centre.
 * A centre exactly on a horizontal edge counts with the half-open rule
 * SPRUE uses (a.y <= y < b.y).
 */
export function fillPolygonEvenOdd(grid: RasterGrid, rings: readonly Ring[], rows: RowOrder): Uint8Array {
  const { w, h, res: ppm } = grid;
  const o = new Uint8Array(w * h);
  const cx = w / 2, cy = h / 2;
  for (let py = 0; py < h; py++) {
    const ymm = (cy - (py + 0.5)) / ppm;
    const xs: number[] = [];
    for (const poly of rings) {
      const n = poly.length;
      for (let i = 0; i < n; i++) {
        const a = poly[i]!, b = poly[(i + 1) % n]!;
        if ((a[1] <= ymm && b[1] > ymm) || (b[1] <= ymm && a[1] > ymm)) {
          const t = (ymm - a[1]) / (b[1] - a[1]);
          xs.push(a[0] + t * (b[0] - a[0]));
        }
      }
    }
    xs.sort((p, q) => p - q);
    const row = rows === "top" ? py : h - 1 - py;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(xs[k]! * ppm + cx - 0.5));
      const x1 = Math.min(w - 1, Math.floor(xs[k + 1]! * ppm + cx - 0.5));
      for (let x = x0; x <= x1; x++) o[row * w + x] = 1;
    }
  }
  return o;
}
