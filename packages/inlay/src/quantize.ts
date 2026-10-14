// Quantize: an RGBA read becomes a slot label grid by colour mode (M03-T03).
// Ported from COLLAR renderLayer, the palette and mono branches
// (collar.html lines 1088 to 1116) and hex2rgb (lines 1119 to 1123),
// lineage collar.bench/inlay-quantize. The source writes row
// `(res - 1 - j)`; that flip belongs to the surface read (surface.ts), so
// here cell (i, j) of the image is cell (i, j) of the grid.

import { commandError } from "@hackbuild/spec";
import type { RgbaImage } from "./intake/image.js";
import { ALPHA_HIT, type LabelGrid } from "./surface.js";

/** palette: nearest slot colour; mono: luminance threshold; alpha: silhouette. */
export type QuantizeMode = "palette" | "mono" | "alpha";

interface GridOptions {
  /** cells per mm of the grid the image was read on */
  readonly res: number;
}

export interface PaletteOptions extends GridOptions {
  /** Slot colours as #rgb or #rrggbb; entry q is slot q + 1. */
  readonly slots: readonly string[];
  /** The body slot (COLLAR ST.base): a pixel nearest to it stays 0. */
  readonly body: number;
}

export interface MonoOptions extends GridOptions {
  /** slot written where the pixel is a hit */
  readonly slot: number;
  /** luminance 0 to 255, default 128 (collar.html `L.thr ?? 128`) */
  readonly thr?: number;
  /** hit at or over thr instead of at or under */
  readonly invert?: boolean;
}

export interface AlphaOptions extends GridOptions {
  readonly slot: number;
}

export interface QuantizeOptionsByMode {
  readonly palette: PaletteOptions;
  readonly mono: MonoOptions;
  readonly alpha: AlphaOptions;
}

/** Default mono threshold, luminance (collar.html line 1105). */
export const MONO_THRESHOLD = 128;

/** "#rgb" or "#rrggbb" (leading # optional) to r, g, b, as COLLAR hex2rgb. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw commandError({ code: "E_SCHEMA", path: "/slots", got: hex, expected: "a colour as #rgb or #rrggbb", hint: "give each slot colour as hex, for example #fe0386" });
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function checkImage(img: RgbaImage): void {
  const ok = Number.isInteger(img.width) && Number.isInteger(img.height) && img.width > 0 && img.height > 0
    && img.data.length === img.width * img.height * 4;
  if (!ok) {
    throw commandError({ code: "E_SCHEMA", path: "/img", got: { width: img.width, height: img.height, bytes: img.data.length }, expected: "width * height * 4 bytes of RGBA, both sides positive integers", hint: "pass the RGBA read of the grid unchanged" });
  }
}

function checkSlot(slot: number, path: string): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > 255) {
    throw commandError({ code: "E_SCHEMA", path, got: slot, expected: "an integer slot 1 to 255", hint: "slot 0 is the body; pick a filament slot from 1" });
  }
}

function palette(d: Uint8ClampedArray, n: number, o: PaletteOptions): Uint8Array {
  const pal = o.slots.map((c, q) => ({ slot: q + 1, rgb: hexToRgb(c) }));
  const map = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const k = p * 4;
    if (d[k + 3]! < ALPHA_HIT) continue;
    let best = 0, bd = 1e9;
    for (const s of pal) {
      const dr = d[k]! - s.rgb[0], dg = d[k + 1]! - s.rgb[1], db = d[k + 2]! - s.rgb[2];
      const q = 0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
      if (q < bd) { bd = q; best = s.slot; }
    }
    if (best !== o.body) map[p] = best;
  }
  return map;
}

function threshold(d: Uint8ClampedArray, n: number, slot: number, mono: MonoOptions | null): Uint8Array {
  const map = new Uint8Array(n);
  const thr = mono?.thr ?? MONO_THRESHOLD, inv = !!mono?.invert;
  for (let p = 0; p < n; p++) {
    const k = p * 4;
    if (d[k + 3]! < ALPHA_HIT) continue;
    let hit: boolean;
    if (mono === null) hit = true;
    else {
      const lum = 0.299 * d[k]! + 0.587 * d[k + 1]! + 0.114 * d[k + 2]!;
      hit = inv ? lum >= thr : lum <= thr;
    }
    if (hit) map[p] = slot;
  }
  return map;
}

/**
 * Label grid of `img` in one colour mode. Pixels with alpha under 120 stay 0
 * in every mode; palette writes the nearest slot unless it is the body slot,
 * mono and alpha write `opts.slot` on a hit.
 */
export function quantize<M extends QuantizeMode>(img: RgbaImage, mode: M, opts: QuantizeOptionsByMode[M]): LabelGrid {
  checkImage(img);
  if (!(opts.res > 0)) {
    throw commandError({ code: "E_SCHEMA", path: "/res", got: opts.res, expected: "cells per mm above 0", hint: "pass the res of the grid the image was read on" });
  }
  const n = img.width * img.height;
  let labels: Uint8Array;
  if (mode === "palette") {
    const o = opts as PaletteOptions;
    if (o.slots.length === 0 || o.slots.length > 255) {
      throw commandError({ code: "E_SCHEMA", path: "/slots", got: o.slots.length, expected: "1 to 255 slot colours", hint: "give the colour of every loaded slot" });
    }
    labels = palette(img.data, n, o);
  } else if (mode === "mono" || mode === "alpha") {
    const o = opts as MonoOptions | AlphaOptions;
    checkSlot(o.slot, "/slot");
    labels = threshold(img.data, n, o.slot, mode === "mono" ? (o as MonoOptions) : null);
  } else {
    throw commandError({ code: "E_SCHEMA", path: "/mode", got: mode, expected: "palette, mono or alpha", hint: "pick a colour mode: palette, mono or alpha" });
  }
  return { w: img.width, h: img.height, res: opts.res, labels };
}
