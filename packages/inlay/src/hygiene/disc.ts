// Disc structuring elements. The two legacy discs differ and parity
// depends on the difference, so each keeps its own rule.
//
// print-forge (rastermesh.js:312 to 345, lineage inlay.hygiene-print-forge):
// offsets with dx^2 + dy^2 <= r^2 + 0.25. Dilate grows slot S only into
// cells labelled `over`. Open erodes then dilates slot S; a disc offset
// outside the grid counts as not-S, so the grid border erodes.
//
// SPRUE (sprue.html:294 to 324, lineage sprue.bench/inlay-hygiene-disc):
// each row dy spans half width floor(sqrt(r^2 - dy^2)), summed by row
// prefix sums. Erosion is not-dilate-not, so cells outside the grid never
// erode the border.

/** print-forge disc offsets for radius r cells. */
export function discOffsets(r: number): readonly (readonly [number, number])[] {
  const disc: [number, number][] = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 0.25) disc.push([dx, dy]);
  return disc;
}

/** print-forge stroke boost: grow slot `slot` by r cells into cells labelled `over`, in place. */
export function discDilateLabels(labels: Uint8Array, w: number, h: number, slot: number, r: number, over: number): void {
  if (r <= 0) return;
  const src = labels.slice(), disc = discOffsets(r);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (src[j * w + i] !== slot) continue;
    for (const [dx, dy] of disc) {
      const x = i + dx, y = j + dy;
      if (x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] === over) labels[y * w + x] = slot;
    }
  }
}

/** print-forge open of slot `slot` with a disc of r cells; cells the open drops become `into`, in place. */
export function openLabels(labels: Uint8Array, w: number, h: number, slot: number, r: number, into: number): void {
  if (r <= 0) return;
  const n = w * h, disc = discOffsets(r), isS = new Uint8Array(n);
  for (let p = 0; p < n; p++) isS[p] = labels[p] === slot ? 1 : 0;
  const er = new Uint8Array(n);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let ok = isS[j * w + i]!;
    for (let d = 0; ok && d < disc.length; d++) {
      const x = i + disc[d]![0], y = j + disc[d]![1];
      if (x < 0 || y < 0 || x >= w || y >= h || !isS[y * w + x]) ok = 0;
    }
    er[j * w + i] = ok;
  }
  const di = new Uint8Array(n);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!er[j * w + i]) continue;
    for (const [dx, dy] of disc) {
      const x = i + dx, y = j + dy;
      if (x >= 0 && y >= 0 && x < w && y < h) di[y * w + x] = 1;
    }
  }
  for (let p = 0; p < n; p++) if (isS[p] && !di[p]) labels[p] = into;
}

/** SPRUE disc dilate of a 0/1 mask by round(r) cells; a new mask. */
export function spanDilate(m: Uint8Array, w: number, h: number, rIn: number): Uint8Array {
  const r = Math.round(rIn);
  if (r <= 0) return m.slice();
  const pre = new Int32Array((w + 1) * h);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const base = y * (w + 1);
    for (let x = 0; x < w; x++) { acc += m[y * w + x]!; pre[base + x + 1] = acc; }
  }
  const o = new Uint8Array(w * h);
  for (let dy = -r; dy <= r; dy++) {
    const s = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let y = 0; y < h; y++) {
      const sy = y + dy;
      if (sy < 0 || sy >= h) continue;
      const pb = sy * (w + 1), ob = y * w;
      for (let x = 0; x < w; x++) {
        if (o[ob + x]) continue;
        const a = x - s < 0 ? 0 : x - s;
        const b = x + s + 1 > w ? w : x + s + 1;
        if (pre[pb + b]! - pre[pb + a]! > 0) o[ob + x] = 1;
      }
    }
  }
  return o;
}

const not = (m: Uint8Array): Uint8Array => m.map((v) => v ^ 1);

/** SPRUE disc erode, not-dilate-not; a new mask. */
export function spanErode(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return Math.round(r) <= 0 ? m.slice() : not(spanDilate(not(m), w, h, r));
}
