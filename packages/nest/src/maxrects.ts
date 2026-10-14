// MaxRects best-short-side-fit, ported from OGEE16 packOne()
// (designs/ogee16/legacy/source/plate_template.html lines 268 to 300;
// lineage ogee16.packone/r16p) with the multi-sheet loop and the five
// sort orders of GUSSET nestOnce() and nest() (originals/gusset/files/gusset-v16.html
// lines 1264 to 1313, byte identical to the repo's legacy copy; lineage
// gusset.bench/nest-orders).
//
// One free-rectangle kernel serves both. The two legacy copies agree on the
// search (every free rectangle, then every turn; smallest short leftover,
// smaller long leftover on a tie, the first candidate on a full tie), the
// split (up to four maximal rectangles around the placed one) and the prune
// (a rectangle inside another goes; of two equal ones the later goes). They
// differ in four places, settled here:
// - fit slack and arithmetic: OGEE's (no slack, packOne's sums term for
//   term); GUSSET adds 1e-6 mm and sums in another order, and float
//   rounding then breaks ties between free rectangles differently;
// - geometry: OGEE's. Each footprint grows by the gap, the free root is the
//   sheet inset by the margin less one gap, and a part sits gap/2 inside
//   its grown rectangle. GUSSET's root is its bin plus one gap with no
//   inset, so GUSSET on a bin of W - 2 margin - 2 gap is this packer on W;
// - sheets: GUSSET's. Each copy goes to the open sheet whose best fit has
//   the smallest short leftover (the first sheet on a tie), else a new
//   sheet. OGEE fills one plate and passes the rest to the next; with one
//   part type per plate that fits one plate, the two agree.

import type { SortOrder } from "@hackbuild/spec";
import type { Box, Frame, Packing, Spot, Turn } from "./box.js";
import { turnsOf } from "./box.js";

export interface Rect {
  /** mm */
  readonly x: number;
  /** mm */
  readonly y: number;
  /** mm */
  readonly w: number;
  /** mm */
  readonly h: number;
}

export interface Fit extends Rect {
  readonly rot: Turn["rot"];
  /** Short side leftover, mm. */
  readonly s: number;
  /** Long side leftover, mm. */
  readonly l: number;
}

/** Best short side fit of the grown turns over the free rectangles, or null; a turn fits with no slack, as in packOne. */
export function findFit(free: readonly Rect[], turns: readonly Turn[]): Fit | null {
  let best: Fit | null = null;
  for (const f of free) {
    for (const t of turns) {
      if (t.w > f.w || t.h > f.h) continue;
      const s = Math.min(f.w - t.w, f.h - t.h), l = Math.max(f.w - t.w, f.h - t.h);
      if (!best || s < best.s || (s === best.s && l < best.l)) best = { x: f.x, y: f.y, w: t.w, h: t.h, rot: t.rot, s, l };
    }
  }
  return best;
}

/**
 * Free rectangles after placing r: each one r overlaps splits into up to
 * four maximal pieces, then a piece inside another goes (of two equal ones
 * the later). The arithmetic is packOne's term for term: rounding decides
 * ties between free rectangles, so GUSSET's reordered sums would move parts.
 */
export function splitFree(free: readonly Rect[], R: Rect): Rect[] {
  const nf: Rect[] = [];
  for (const g of free) {
    if (g.x >= R.x + R.w || g.x + g.w <= R.x || g.y >= R.y + R.h || g.y + g.h <= R.y) {
      nf.push(g);
      continue;
    }
    if (R.x > g.x) nf.push({ x: g.x, y: g.y, w: R.x - g.x, h: g.h });
    if (R.x + R.w < g.x + g.w) nf.push({ x: R.x + R.w, y: g.y, w: g.x + g.w - (R.x + R.w), h: g.h });
    if (R.y > g.y) nf.push({ x: g.x, y: g.y, w: g.w, h: R.y - g.y });
    if (R.y + R.h < g.y + g.h) nf.push({ x: g.x, y: R.y + R.h, w: g.w, h: g.y + g.h - (R.y + R.h) });
  }
  return nf.filter((a, i) => !nf.some((b, j) => j !== i
    && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h
    && (a.w < b.w || a.h < b.h || i > j)));
}

type Cmp = (a: Box, b: Box) => number;

/** GUSSET's five orders with their tie breaks (lines 1265 to 1271), largest first. */
export const SORT_ORDERS: Readonly<Record<SortOrder, Cmp>> = {
  maxSide: (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w * b.h - a.w * a.h,
  area: (a, b) => b.w * b.h - a.w * a.h,
  height: (a, b) => b.h - a.h || b.w - a.w,
  width: (a, b) => b.w - a.w || b.h - a.h,
  minSide: (a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h) || b.w * b.h - a.w * a.h,
};

/** The fixed order fill mode tries them in; ties go to the lower index. */
export const ORDER_LIST: readonly SortOrder[] = ["maxSide", "area", "height", "width", "minSide"];

/** MaxRects over as many sheets as the boxes need, boxes sorted by `order` (a stable sort). */
export function maxrectsPack(boxes: readonly Box[], frame: Frame, order: SortOrder): Packing {
  const [W, H] = frame.sheet;
  const { gap, margin } = frame;
  const UW = W - 2 * margin - gap, UH = H - 2 * margin - gap;
  const bins: { free: Rect[] }[] = [];
  const spots: Spot[] = [];
  const oversize: Box[] = [];
  for (const it of boxes.slice().sort(SORT_ORDERS[order])) {
    const turns = turnsOf(it, frame.rotations).map((t) => ({ w: t.w + gap, h: t.h + gap, rot: t.rot }));
    if (!turns.some((t) => t.w <= UW && t.h <= UH)) {
      oversize.push(it);
      continue;
    }
    let fit: Fit | null = null, at = -1;
    for (let i = 0; i < bins.length; i++) {
      const f = findFit(bins[i]!.free, turns);
      if (f && (!fit || f.s < fit.s)) {
        fit = f;
        at = i;
      }
    }
    if (fit === null) {
      bins.push({ free: [{ x: 0, y: 0, w: UW, h: UH }] });
      at = bins.length - 1;
      fit = findFit(bins[at]!.free, turns);
      if (fit === null) {
        bins.pop();
        oversize.push(it);
        continue;
      }
    }
    const bin = bins[at]!;
    bin.free = splitFree(bin.free, fit);
    spots.push({ box: it, sheet: at, x: margin + fit.x + gap / 2, y: margin + fit.y + gap / 2, rot: fit.rot });
  }
  return { sheets: bins.length, spots, oversize };
}
