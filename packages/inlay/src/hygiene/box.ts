// Square structuring elements.
//
// boxDilate is COLLAR's separable box (collar.html:942 to 967, lineage
// collar.bench/inlay-hygiene-box): a row pass then a column pass of a
// sliding count, radius round(rPx), cells outside the grid count as empty.
// A radius under 1 px returns the input mask itself, as COLLAR does.
//
// gapLabels is the print-forge colour gap (rastermesh.js:346 to 362, lineage
// inlay.hygiene-print-forge): a cell of slot S within a (2g + 1) square of a
// cell of another art slot goes to `into`; cells outside the grid are skipped.

/** COLLAR box dilate of a 0/1 mask; a new mask unless rPx < 1. */
export function boxDilate(mask: Uint8Array, w: number, h: number, rPx: number): Uint8Array {
  if (rPx < 1) return mask;
  const r = Math.round(rPx), n = w * h, tmp = new Uint8Array(n), out = new Uint8Array(n);
  for (let j = 0; j < h; j++) {
    const row = j * w;
    let cnt = 0;
    for (let i = -r; i <= r; i++) if (i >= 0 && i < w && mask[row + i]) cnt++;
    for (let i = 0; i < w; i++) {
      tmp[row + i] = cnt > 0 ? 1 : 0;
      const drop = i - r, add = i + r + 1;
      if (drop >= 0 && mask[row + drop]) cnt--;
      if (add < w && mask[row + add]) cnt++;
    }
  }
  for (let i = 0; i < w; i++) {
    let cnt = 0;
    for (let j = -r; j <= r; j++) if (j >= 0 && j < h && tmp[j * w + i]) cnt++;
    for (let j = 0; j < h; j++) {
      out[j * w + i] = cnt > 0 ? 1 : 0;
      const drop = j - r, add = j + r + 1;
      if (drop >= 0 && tmp[drop * w + i]) cnt--;
      if (add < h && tmp[add * w + i]) cnt++;
    }
  }
  return out;
}

/** print-forge colour gap of slot `slot` by `g` cells, in place. Neighbours that are 0, `slot` or `into` do not count. */
export function gapLabels(labels: Uint8Array, w: number, h: number, slot: number, g: number, into: number): void {
  if (g <= 0) return;
  const src = labels.slice();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = j * w + i;
    if (src[p] !== slot) continue;
    let near = false;
    for (let dy = -g; dy <= g && !near; dy++) for (let dx = -g; dx <= g && !near; dx++) {
      const x = i + dx, y = j + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const q = src[y * w + x];
      if (q !== slot && q !== 0 && q !== into) near = true;
    }
    if (near) labels[p] = into;
  }
}
