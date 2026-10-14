// Ring layers: COLLAR renderLayer ring branch (collar.html:992 to 1008,
// lineage collar.bench/inlay-ring), evaluated per cell with no surface.
//
// COLLAR evaluates a ring cell at y = (res / 2 - j - 0.5) / k and stores it
// at row j without the readMask flip, so ring rows run top-down while text
// and image rows run bottom-up. A one-segment ring is symmetric and the two
// orders agree; a segmented ring comes out mirrored top to bottom against the
// text. The port keeps the legacy order so COLLAR parity (M03-T09) holds
// cell for cell.

import type { LayerResult, RasterGrid } from "../surface.js";

export interface RingLayer {
  kind: "ring";
  slot: number;
  /** mm, either order */
  r0: number;
  /** mm */
  r1: number;
  /** segments round the ring, count; 1 or absent is a full ring */
  seg?: number;
  /** percent of each segment painted, default 100 */
  duty?: number;
  cut?: boolean;
  off?: boolean;
}

export function renderRing(L: RingLayer, grid: RasterGrid): LayerResult[] {
  const { w, h, res: k } = grid;
  const map = new Uint8Array(w * h);
  const r0 = Math.min(L.r0, L.r1), r1 = Math.max(L.r0, L.r1);
  const seg = Math.max(1, (L.seg ?? 0) | 0), dutyA = (L.duty ?? 100) / 100;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = (i + 0.5 - w / 2) / k, y = (h / 2 - j - 0.5) / k;
    const d = Math.hypot(x, y);
    if (d < r0 || d > r1) continue;
    if (seg > 1) {
      const t = Math.atan2(y, x) + Math.PI, pa = 2 * Math.PI / seg;
      const f = (t % pa) / pa;
      if (f > dutyA) continue;
    }
    map[j * w + i] = 1;
  }
  return [{ mask: map, slot: L.slot }];
}
