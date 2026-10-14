// Image layers: COLLAR renderLayer image branch (collar.html:1073 to 1087,
// lineage collar.bench/inlay-image). The image is centred at (dx, dy) mm with
// its long side spanning 2 R_art x scale, rotated, optionally mirrored, and
// read back as RGBA on the grid. The colour mode (mono threshold,
// silhouette, palette) is quantize's job (M03-T03) on that read.

import type { ImageInput, RasterGrid, RgbaImage, Surface } from "../surface.js";

export interface ImageLayer {
  kind: "image";
  /** null: nothing loaded yet, the layer paints nothing */
  img: ImageInput | null;
  mode: "mono" | "alpha" | "palette";
  /** slot for mono and alpha hits */
  slot: number;
  /** long side as a fraction of the art diameter, default 1 */
  scale?: number;
  /** mm */
  dx: number;
  /** mm */
  dy: number;
  /** degrees counter-clockwise */
  rot?: number;
  mirror?: boolean;
  /** mono: luminance at or under thr is a hit, default 128 */
  thr?: number;
  /** mono: luminance at or over thr is a hit instead */
  invert?: boolean;
  cut?: boolean;
  off?: boolean;
}

/** The image painted on a cleared surface and read back, or null when there is no image or it has no size. */
export function drawImageLayer(L: ImageLayer, surface: Surface, grid: RasterGrid, rArt: number): RgbaImage | null {
  if (!L.img) return null;
  const iw = L.img.width, ih = L.img.height;
  if (!iw || !ih) return null;
  const artD = 2 * rArt * (L.scale ?? 1);
  surface.clear();
  surface.drawImage(L.img, L.dx, L.dy, artD, (L.rot || 0) * Math.PI / 180, !!L.mirror);
  return surface.readRgba(grid);
}
