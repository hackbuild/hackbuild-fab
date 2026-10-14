// Otsu threshold and polarity for dropped art (M03-T03 step 5). Ported from
// SPRUE autoThreshold (sprue.html lines 1517 to 1538), lineage
// sprue.bench/inlay-otsu. The source downscales on a canvas first; that
// resample belongs to ui-core, so otsu takes the already-scaled image and
// otsuSize gives the size the source would scale to.

import { commandError } from "@hackbuild/spec";
import type { RgbaImage } from "./intake/image.js";

/** Long side the source scales to, px (sprue.html `256 / Math.max(...)`). */
export const OTSU_LONG_SIDE = 256;
/** Smallest side the source scales to, px (sprue.html `Math.max(8, ...)`). */
export const OTSU_MIN_SIDE = 8;

export interface OtsuResult {
  /** mono threshold 1 to 254 */
  readonly thr: number;
  /** true when the border is darker than the threshold: hit on light pixels */
  readonly invert: boolean;
}

/** The canvas size autoThreshold draws an image of this size at. */
export function otsuSize(width: number, height: number): { width: number; height: number } {
  const k = Math.min(1, OTSU_LONG_SIDE / Math.max(width, height));
  return { width: Math.max(OTSU_MIN_SIDE, Math.round(width * k)), height: Math.max(OTSU_MIN_SIDE, Math.round(height * k)) };
}

/**
 * Otsu over a 256-bin histogram of luminance composited over white by
 * alpha; threshold t + 1 at the largest between-class variance, 128 when it
 * is 0, clamped 1 to 254; invert when the mean border luminance is below the
 * threshold before the clamp, as the source compares.
 */
export function otsu(img: RgbaImage): OtsuResult {
  const W = img.width, H = img.height, d = img.data;
  const want = otsuSize(W, H);
  if (!(W > 0 && H > 0) || want.width !== W || want.height !== H || d.length !== W * H * 4) {
    throw commandError({ code: "E_SCHEMA", path: "/img", got: { width: W, height: H, bytes: d.length }, expected: `the otsuSize of the source, ${want.width} x ${want.height}, as RGBA`, hint: "downscale the image to otsuSize(width, height) before otsu" });
  }
  const hist = new Float64Array(256);
  let n = 0, border = 0, bn = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const a = d[i + 3]! / 255;
    const lum = Math.round((0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!) * a + 255 * (1 - a));
    hist[lum] = hist[lum]! + 1;
    n++;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { border += lum; bn++; }
  }
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i]!;
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!;
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t]!;
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; thr = t + 1; }
  }
  const borderMean = bn ? border / bn : 255;
  if (best === 0) thr = 128;
  return { thr: Math.max(1, Math.min(254, thr)), invert: borderMean < thr };
}
