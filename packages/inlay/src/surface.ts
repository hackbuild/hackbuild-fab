// The injected painter (D-045). The kernel lays out text, rings and images
// in model mm and hands the painting to a Surface: ui-core supplies a canvas
// surface for the browser, geom a vector surface for node. Coordinates are
// model mm with the origin at the grid centre and y up; angles are radians,
// counter-clockwise.
//
// Row order: grid row j holds model y from (j - h / 2) / res to
// (j + 1 - h / 2) / res, so row 0 is the bottom edge. This is the flip
// COLLAR's readMask applies on read (`(res - 1 - j)`, collar.html:928 to
// 934), and it belongs to the surface read, never to quantize (M03-T03
// step 6).

import type { Affine, RasterGrid } from "@hackbuild/geom";
import type { RgbaImage } from "./intake/image.js";

export type { Affine, RasterGrid, RgbaImage };

/** Slot number per cell in surface row order. 0 is the host or body slot. */
export interface LabelGrid extends RasterGrid {
  readonly labels: Uint8Array;
}

/** An image only the painting surface can draw, such as a decoded browser image; width and height are its natural pixel size. */
export interface NativeImage {
  readonly width: number;
  readonly height: number;
  readonly native: unknown;
}

export type ImageInput = RgbaImage | NativeImage;

export interface TextOptions {
  /** "left" puts the run's start at the origin, "center" its middle (canvas textAlign). */
  readonly align: "left" | "center";
  /** mm along the rotated baseline from the origin to where the run is set. */
  readonly along: number;
  /** Canvas textBaseline; absent is "alphabetic". SPRUE sets straight text on "middle" (sprue.html:1088). */
  readonly baseline?: "alphabetic" | "middle";
  /** Letter spacing, mm (canvas letterSpacing); absent is 0. SPRUE tracking (sprue.html:1089). */
  readonly spacing?: number;
}

/** Alpha above this counts as painted (collar.html:932, `> 120`). */
export const ALPHA_HIT = 120;

export interface Surface {
  /** Advance width in mm of `text` set in `font` (CSS weight and family, no size) at `sizeMm` mm. */
  measure(text: string, font: string, sizeMm: number): number;
  /**
   * Fill text on the alphabetic baseline. The frame origin sits at (x, y) mm
   * and is rotated `rot` radians; the run is set `opts.along` mm along the
   * baseline with `opts.align`. Default along 0, align left, alphabetic
   * baseline, no letter spacing.
   */
  fillText(text: string, font: string, sizeMm: number, x: number, y: number, rot: number, opts?: TextOptions): void;
  /** Fill SVG path data even-odd; `transform` maps path units to model mm. */
  fillPath(svgPath: string, transform: Affine): void;
  /**
   * Draw an image centred at (cx, cy) mm, scaled so its long side spans
   * `spanMm` mm, rotated `rot` radians, mirrored in its own x when `mirror`.
   */
  drawImage(img: ImageInput, cx: number, cy: number, spanMm: number, rot: number, mirror: boolean): void;
  /** Alpha 0 to 255 per cell of `grid`, in surface row order. */
  readAlpha(grid: RasterGrid): Uint8Array;
  /** RGBA per cell of `grid`, in surface row order. */
  readRgba(grid: RasterGrid): RgbaImage;
  clear(): void;
}

/**
 * What one layer paints (collar.html renderLayer): a 0 or 1 coverage mask
 * bound to one slot, or a slot per cell (a palette image, 0 left alone).
 */
export type LayerResult = { readonly mask: Uint8Array; readonly slot: number } | { readonly map: Uint8Array };

/** Coverage mask from a surface read: alpha above ALPHA_HIT is 1. */
export function readMask(surface: Surface, grid: RasterGrid): Uint8Array {
  const a = surface.readAlpha(grid);
  const m = new Uint8Array(a.length);
  for (let p = 0; p < a.length; p++) if (a[p]! > ALPHA_HIT) m[p] = 1;
  return m;
}
