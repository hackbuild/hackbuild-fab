// The node painter for the inlay Surface (M03-T04 step 5). It fills SVG
// paths exactly at cell centres and reads them back on the grid it was made
// for. Ring and shape layers never reach a surface, so they render the same
// in node and in the browser. Text is set from the vendored Plex Mono glyph
// table (src/text/outline.ts) and fills cell centres like a path; another
// family refuses with E_KERNEL. Images need a resampler that node does not
// have; that call refuses instead of painting something the browser would
// paint differently.

import { commandError, type Ring } from "@hackbuild/spec";
import { fillPolygonEvenOdd, type RasterGrid } from "./fill.js";
import { flattenSvgPath, type Affine } from "./svgpath.js";
import { measureText, textRings, type TextPlacement } from "../text/outline.js";

/**
 * Points per curve segment for a filled path layer: the KEYWAY family's
 * svgpath.py counts (cubic n 12, quadratic n 10; the rule svgpath.ts
 * documents), so a logo with C, S, Q or T fills from the same rings the
 * vinyl route cuts. Arcs stay refused, as svgpath.py raises on them.
 */
export const PATH_CURVE_POINTS = { cubic: 12, quad: 10 } as const;

function noResampler(got: unknown): Error {
  return commandError({
    code: "E_KERNEL",
    got,
    record: "kernels/art-inlay",
    hint: "image needs the browser canvas surface (bench-core canvasSurface); node has no image resampler",
  });
}

/** Paints SVG paths as cell-centre coverage; alpha is 255 inside and 0 outside. */
export class VectorSurface {
  readonly grid: RasterGrid;
  #paths: Ring[][] = [];

  constructor(grid: RasterGrid) {
    this.grid = grid;
  }

  /** Advance width in mm of `text` in `font` (CSS weight and family) at `sizeMm`, as canvas measureText with no letter spacing. */
  measure(text: string, font: string, sizeMm: number): number {
    return measureText(text, font, sizeMm);
  }

  /** Glyph outlines at the canvas placement of the same call; each glyph fills even-odd on its own. */
  fillText(text: string, font: string, sizeMm: number, x: number, y: number, rot: number, opts?: TextPlacement): void {
    for (const rings of textRings(text, font, sizeMm, x, y, rot, opts)) this.#paths.push(rings);
  }

  /** Path units map to model mm, y up, through `transform`; each path fills even-odd on its own. */
  fillPath(svgPath: string, transform: Affine): void {
    this.#paths.push(flattenSvgPath(svgPath, transform, { curves: PATH_CURVE_POINTS }));
  }

  drawImage(img: { readonly width: number; readonly height: number }): void {
    throw noResampler(`${img.width} x ${img.height}`);
  }

  /** Row 0 at the bottom (y up), the inlay label grid order. */
  readAlpha(grid: RasterGrid): Uint8Array {
    this.#same(grid);
    const out = new Uint8Array(grid.w * grid.h);
    for (const rings of this.#paths) {
      const m = fillPolygonEvenOdd(grid, rings, "bottom");
      for (let p = 0; p < out.length; p++) if (m[p]) out[p] = 255;
    }
    return out;
  }

  /** Black where painted, as the COLLAR canvas fills; alpha as readAlpha. */
  readRgba(grid: RasterGrid): { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray } {
    const a = this.readAlpha(grid);
    const data = new Uint8ClampedArray(a.length * 4);
    for (let p = 0; p < a.length; p++) data[p * 4 + 3] = a[p]!;
    return { width: grid.w, height: grid.h, data };
  }

  clear(): void {
    this.#paths = [];
  }

  #same(grid: RasterGrid): void {
    const g = this.grid;
    if (grid.w !== g.w || grid.h !== g.h || grid.res !== g.res) {
      throw commandError({
        code: "E_SCHEMA",
        path: "/grid",
        got: `${grid.w} x ${grid.h} at ${grid.res}`,
        expected: `${g.w} x ${g.h} at ${g.res} cells per mm`,
        hint: "read back on the grid the surface was made for",
      });
    }
  }
}

export function vectorSurface(grid: RasterGrid): VectorSurface {
  return new VectorSurface(grid);
}
