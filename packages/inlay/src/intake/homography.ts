// Rectify a photographed card to a flat rectangle (M03-T02 step 2).
// Port of badge-replicator src/lib/homography.ts (lineage
// inlay.intake-homography/badge-replicator), arithmetic in source order.

import { commandError } from "@hackbuild/spec";
import { at, checkImage, checkSide, row, type Point, type RgbaImage } from "./image.js";

export type Homography = readonly [number, number, number, number, number, number, number, number, number];

/**
 * Solve the 8 unknowns of the projective transform taking src[4] to dst[4].
 * h33 is pinned to 1, the normalisation a hand-marked card quadrilateral
 * tolerates.
 */
export function solveHomography(src: readonly Point[], dst: readonly Point[]): Homography {
  if (src.length !== 4 || dst.length !== 4) {
    throw commandError({
      code: "E_SCHEMA",
      path: src.length !== 4 ? "/src" : "/dst",
      got: src.length !== 4 ? src.length : dst.length,
      expected: "exactly 4 point pairs",
      hint: "mark four corners on the card; a homography needs exactly four point pairs",
    });
  }
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = row(src, i);
    const { x: X, y: Y } = row(dst, i);
    a.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    a.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  const h = gaussianSolve(a, b);
  return [at(h, 0), at(h, 1), at(h, 2), at(h, 3), at(h, 4), at(h, 5), at(h, 6), at(h, 7), 1] as const;
}

/** Gauss-Jordan with partial pivoting. Square systems only. A zero pivot divides by 1e-12. */
export function gaussianSolve(a: readonly (readonly number[])[], b: readonly number[]): number[] {
  const n = b.length;
  const m = a.map((r, i) => r.concat([at(b, i)]));
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(at(row(m, r), col)) > Math.abs(at(row(m, pivot), col))) pivot = r;
    }
    const swap = row(m, col);
    m[col] = row(m, pivot);
    m[pivot] = swap;
    const mc = row(m, col);
    const d = at(mc, col) || 1e-12;
    for (let c = col; c <= n; c++) mc[c] = at(mc, c) / d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const mr = row(m, r);
      const f = at(mr, col);
      for (let c = col; c <= n; c++) mr[c] = at(mr, c) - f * at(mc, c);
    }
  }
  return m.map((r) => at(r, n));
}

/**
 * Sample the source through the inverse transform into a width by height
 * rectangle, bilinear per channel, alpha 255, with anything outside the
 * source left black and opaque.
 */
export function warpToRect(source: RgbaImage, corners: readonly Point[], width: number, height: number): Uint8ClampedArray {
  checkImage(source, "/source");
  checkSide(width, height, "/size");
  const out = new Uint8ClampedArray(width * height * 4);
  const sd = source.data;
  const sw = source.width;
  const sh = source.height;
  const destRect: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = solveHomography(destRect, corners);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const w = h6 * x + h7 * y + h8;
      const sx = (h0 * x + h1 * y + h2) / w;
      const sy = (h3 * x + h4 * y + h5) / w;
      const o = (y * width + x) * 4;
      if (sx < 0 || sy < 0 || sx > sw - 1 || sy > sh - 1) {
        out[o + 3] = 255;
        continue;
      }
      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = at(sd, i00 + ch) + (at(sd, i10 + ch) - at(sd, i00 + ch)) * fx;
        const bottom = at(sd, i01 + ch) + (at(sd, i11 + ch) - at(sd, i01 + ch)) * fx;
        out[o + ch] = top + (bottom - top) * fy;
      }
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Output size from marked corners: mean opposite edges, long edge capped, 64 floor per side. */
export function suggestSize(corners: readonly Point[], cap = 1600): { width: number; height: number } {
  const d = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
  const c = (i: number): Point => row(corners, i);
  let width = Math.round((d(c(0), c(1)) + d(c(3), c(2))) / 2);
  let height = Math.round((d(c(0), c(3)) + d(c(1), c(2))) / 2);
  const long = Math.max(width, height);
  if (long > cap) {
    const scale = cap / long;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  return { width: Math.max(64, width), height: Math.max(64, height) };
}
