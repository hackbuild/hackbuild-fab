// Shelf packer, ported from SLUG nest() (designs/slug/legacy/slug.html
// lines 1061 to 1106; lineage slug.nest/slug-12). The order of operations
// is the page's, so the legacy-shelf mode gives SLUG's placements exactly:
// copies sorted by max side, largest first (a stable sort, so equal sides
// keep input order); for each copy the allowed turns that fit the usable
// area; on each open sheet in order, each turn in order, each shelf in
// order, the first shelf whose height takes the turn and whose run has room;
// else a new shelf under the last one on that sheet with the first turn;
// else the next sheet; else a new sheet. Usable area is the sheet inset by
// the margin on each side; the gap follows each part along a shelf and each
// shelf. The 1e-6 mm slack is the page's.

import type { Box, Frame, Packing, Spot, Turn } from "./box.js";
import { turnsOf } from "./box.js";

const SLACK = 1e-6;

interface Shelf {
  readonly y: number;
  readonly h: number;
  x: number;
}

export function shelfPack(boxes: readonly Box[], frame: Frame): Packing {
  const [W, H] = frame.sheet;
  const { gap, margin } = frame;
  const items = boxes.slice().sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const AW = W - 2 * margin, AH = H - 2 * margin;
  const sheets: { shelves: Shelf[] }[] = [];
  const spots: Spot[] = [];
  const oversize: Box[] = [];
  const put = (box: Box, sheet: number, o: Turn, x: number, y: number): void => {
    spots.push({ box, sheet, x, y, rot: o.rot });
  };
  for (const it of items) {
    const opts = turnsOf(it, frame.rotations).filter((o) => o.w <= AW + SLACK && o.h <= AH + SLACK);
    const first = opts[0];
    if (first === undefined) {
      oversize.push(it);
      continue;
    }
    let done = false;
    for (let si = 0; si < sheets.length && !done; si++) {
      const sh = sheets[si]!;
      for (const o of opts) {
        for (const s of sh.shelves) {
          if (o.h <= s.h + SLACK && s.x + o.w <= AW + SLACK) {
            put(it, si, o, margin + s.x, margin + s.y);
            s.x += o.w + gap;
            done = true;
            break;
          }
        }
        if (done) break;
      }
      if (done) break;
      const top = sh.shelves.length ? sh.shelves[sh.shelves.length - 1]! : null;
      const ny = top ? top.y + top.h + gap : 0;
      if (ny + first.h <= AH + SLACK) {
        sh.shelves.push({ y: ny, h: first.h, x: first.w + gap });
        put(it, si, first, margin, margin + ny);
        done = true;
      }
    }
    if (!done) {
      sheets.push({ shelves: [{ y: 0, h: first.h, x: first.w + gap }] });
      put(it, sheets.length - 1, first, margin, margin);
    }
  }
  return { sheets: sheets.length, spots, oversize };
}
