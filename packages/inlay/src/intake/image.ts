// Intake types and the checked reads the ports share (M03-T02).
// Option shapes are badge-replicator src/lib/types.ts lines 109 to 147 and
// clamp is src/lib/units.ts (lineage inlay.intake-types/badge-replicator,
// inlay.intake-clamp/badge-replicator). RgbaImage has the fields of the
// browser image data type, so a browser caller passes one directly; this
// package never constructs one (D-045).

import { commandError } from "@hackbuild/spec";

/** Row-major RGBA, 4 bytes per pixel, width * height * 4 long. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** A pixel position in the source image, x right, y down. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export type KnockoutMode = "key" | "edges" | "none";

export interface KnockoutOptions {
  readonly mode: KnockoutMode;
  /** The colour removed in key mode, as r, g, b. */
  readonly key: readonly [number, number, number];
  /** Colour distance treated as background, 0 to 200. */
  readonly tolerance: number;
  /** Extra distance faded rather than cut, for a softer edge. */
  readonly softness: number;
  /** Crop the result to what is left after the knockout. */
  readonly trim: boolean;
}

/** Rejection method for the photo stack. */
export type StackMethod = "median" | "percentile" | "min" | "mean" | "trimmed";

export interface StackOptions {
  readonly method: StackMethod;
  /** Percentile 1 to 50, used by the percentile method. */
  readonly percentile: number;
  /** Fraction trimmed from each end, used by the trimmed method. */
  readonly trim: number;
}

/**
 * Longest side raster intake takes, in px. D-166 and ARCHITECTURE.md 11.1
 * ("raster art, inlay intake, at most 8192 px per side"); a plan budget,
 * inferred. A design that reaches it gets a new decision, never a raise here.
 */
export const RASTER_MAX_SIDE = 8192;

const RASTER_RULE = "inlay-intake/raster-size";

/**
 * Refuse a width or height that is not an integer 1 to RASTER_MAX_SIDE.
 * Every intake entry that allocates from a declared size calls this (or
 * checkImage) first, so an untrusted size never reaches an allocation.
 */
export function checkSide(width: number, height: number, path: string): void {
  const ok = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= RASTER_MAX_SIDE;
  if (!ok(width) || !ok(height)) {
    throw commandError({
      code: "E_SCHEMA",
      path,
      got: { width, height },
      expected: `width and height integers 1 to ${RASTER_MAX_SIDE} px (D-166 raster limit)`,
      record: RASTER_RULE,
      hint: `scale the art to at most ${RASTER_MAX_SIDE} px per side before intake`,
    });
  }
}

/** checkSide, then a buffer of exactly width * height * 4 bytes. Reads data.length only. */
export function checkImage(img: RgbaImage, path: string): void {
  checkSide(img.width, img.height, path);
  const bytes = img.width * img.height * 4;
  if (img.data.length !== bytes) {
    throw commandError({
      code: "E_SCHEMA",
      path,
      got: { width: img.width, height: img.height, bytes: img.data.length },
      expected: `${bytes} bytes of RGBA (width * height * 4), sides at most ${RASTER_MAX_SIDE} px (D-166 raster limit)`,
      record: RASTER_RULE,
      hint: "pass the RGBA read of the image unchanged; its length must match its declared size",
    });
  }
}

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/**
 * Checked index read. The sources read unchecked; every read they make is in
 * range for the inputs they accept, so a throw here marks an input the source
 * would have turned into NaN.
 */
export function at(a: ArrayLike<number>, i: number): number {
  const v = a[i];
  if (v === undefined) {
    throw commandError({ code: "E_KERNEL", got: i, expected: `an index below ${a.length}`, record: "kernels/art-inlay", hint: "intake read past the end of a buffer; report the input sizes" });
  }
  return v;
}

/** Checked row read for the arrays of rows in the homography solve. */
export function row<T>(a: readonly T[], i: number): T {
  const v = a[i];
  if (v === undefined) {
    throw commandError({ code: "E_KERNEL", got: i, expected: `a row below ${a.length}`, record: "kernels/art-inlay", hint: "intake read past the end of a matrix; report the input sizes" });
  }
  return v;
}
