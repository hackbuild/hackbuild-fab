// Layer bounds as mask bounds: the layer is rendered alone at the quick
// raster with its placement removed, and the bounds of the painted cells
// are cached by the canonical JSON of what was rendered (KNUCKLE part6.js
// layerBBox, lines 412 to 431, lineage inlay.face-editor/knuckle-part6;
// COLLAR collar.html:2103 to 2130 renders at 160 px and keys by a
// signature). The cache keeps at most BBOX_CACHE_MAX entries and drops the
// oldest first (part6.js:429).

import { canonicalize } from "@hackbuild/spec";
import type { LayerResult, RasterGrid } from "@hackbuild/inlay";
import type { BBox } from "./hit.js";

/** part6.js:429 */
export const BBOX_CACHE_MAX = 200;
/** Margin added round the painted cell centres, mm (part6.js:427). */
export const BBOX_PAD_MM = 0.5;

/** Which model row grid row j holds: "bottom" is the surface read order, "top" the ring order (inlay layers/ring.ts). */
export type Rows = "bottom" | "top";

/** Bounds of every painted cell across the results, or null when nothing painted. */
export function maskBounds(results: readonly LayerResult[], grid: RasterGrid, rows: Rows): BBox | null {
  const { w, h, res } = grid;
  let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
  for (const r of results) {
    const m = "map" in r ? r.map : r.mask;
    for (let j = 0; j < h; j++) {
      const row = j * w;
      for (let i = 0; i < w; i++) {
        if (!m[row + i]) continue;
        if (i < i0) i0 = i;
        if (i > i1) i1 = i;
        if (j < j0) j0 = j;
        if (j > j1) j1 = j;
      }
    }
  }
  if (i1 < i0) return null;
  const x = (i: number): number => (i + 0.5 - w / 2) / res;
  const y = (j: number): number => (rows === "bottom" ? j + 0.5 - h / 2 : h / 2 - j - 0.5) / res;
  const ya = y(j0), yb = y(j1);
  return { x0: x(i0) - BBOX_PAD_MM, x1: x(i1) + BBOX_PAD_MM, y0: Math.min(ya, yb) - BBOX_PAD_MM, y1: Math.max(ya, yb) + BBOX_PAD_MM };
}

/**
 * An image is pixels, so it takes part in a key by identity: each image
 * object gets a serial the first time it is keyed.
 */
const imageIds = new WeakMap<object, number>();
let nextImage = 1;
export function imageKey(img: object): string {
  let n = imageIds.get(img);
  if (n === undefined) {
    n = nextImage++;
    imageIds.set(img, n);
  }
  return `image#${n}`;
}

export class BBoxCache {
  readonly #map = new Map<string, BBox | null>();

  get size(): number {
    return this.#map.size;
  }

  /** The bounds for `local` (a layer with its placement removed, as plain JSON), rendering only on a miss. */
  get(local: unknown, render: () => BBox | null): BBox | null {
    const key = canonicalize(local);
    if (this.#map.has(key)) return this.#map.get(key)!;
    const bb = render();
    this.#map.set(key, bb);
    if (this.#map.size > BBOX_CACHE_MAX) this.#map.delete(this.#map.keys().next().value!);
    return bb;
  }

  clear(): void {
    this.#map.clear();
  }
}
