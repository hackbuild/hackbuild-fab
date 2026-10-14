// The ladder rule (D-092, SPLICE rev C README; knowledge/designs/splice.md
// 4.2): every row on one pitch grid (2.54 mm), every run orthogonal or at
// 45 degrees, one trace width everywhere, so the gap between neighbours is
// pitch minus width (0.94 mm at 1.6 mm traces). The audit reads cut
// geometry back: the least gap between nets, the direction of every
// straight run, and the centre lines of horizontal runs, which must sit on
// one grid.

import type { Section } from "@hackbuild/geom";
import type { Mm } from "@hackbuild/spec";
import { tightestPairs } from "./helpers.js";

/** A cut file read as a ladder board: its nets in file order, the pitch and the one trace width. */
export interface LadderDecl {
  /** Path of the cut file, relative to the reference. */
  readonly source: string;
  readonly nets: readonly string[];
  readonly pitch: Mm;
  readonly width: Mm;
}

/** Gap between neighbouring rows of one width on a pitch, mm. */
export function ladderGap(pitch: Mm, width: Mm): Mm {
  return pitch - width;
}

export interface LadderAudit {
  readonly gap: Mm;
  /** The first tied pair in net order, and the whole tie (helpers.ts TIE_MM). */
  readonly pair: string;
  readonly ties: readonly string[];
  /** Runs at least minRun long that are neither orthogonal nor 45 degrees, as "net angle". */
  readonly offAngle: readonly string[];
  /** Horizontal run centre lines by net, lowest first, each with its offset from the lowest row modulo the pitch. */
  readonly rows: readonly LadderRow[];
}

export interface LadderRow {
  readonly net: string;
  readonly y: Mm;
  /** Distance to the nearest grid line through the lowest row, mm. */
  readonly offGrid: Mm;
}

export interface LadderOptions {
  readonly pitch: Mm;
  readonly width: Mm;
  /** Shortest edge read as a run, mm; pill ends are sampled shorter. */
  readonly minRun: Mm;
  /** Angle tolerance, degrees. */
  readonly angleTol: number;
  /** Length tolerance for widths and grid offsets, mm. */
  readonly tol: Mm;
}

export function ladderAudit(nets: readonly (readonly [string, Section])[], o: LadderOptions): LadderAudit {
  const { least: gap, pair, ties } = tightestPairs(nets);
  const offAngle: string[] = [];
  const rows: { net: string; y: number }[] = [];
  for (const [name, s] of nets) {
    const horizontal: { y: number; x0: number; x1: number }[] = [];
    for (const r of s.rings) {
      for (let i = 0; i < r.length; i++) {
        const [ax, ay] = r[i]!;
        const [bx, by] = r[(i + 1) % r.length]!;
        const len = Math.hypot(bx - ax, by - ay);
        if (len < o.minRun) continue;
        const deg = ((Math.atan2(by - ay, bx - ax) * 180) / Math.PI + 360) % 45;
        if (Math.min(deg, 45 - deg) > o.angleTol) offAngle.push(`${name} ${(((Math.atan2(by - ay, bx - ax) * 180) / Math.PI + 360) % 360).toFixed(1)}`);
        if (Math.abs(by - ay) <= o.tol) horizontal.push({ y: (ay + by) / 2, x0: Math.min(ax, bx), x1: Math.max(ax, bx) });
      }
    }
    // A row is two horizontal runs of the same net one width apart over a shared stretch.
    for (let i = 0; i < horizontal.length; i++) {
      for (let j = i + 1; j < horizontal.length; j++) {
        const a = horizontal[i]!, b = horizontal[j]!;
        const shared = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        if (shared >= o.minRun && Math.abs(Math.abs(a.y - b.y) - o.width) <= o.tol) rows.push({ net: name, y: (a.y + b.y) / 2 });
      }
    }
  }
  const base = rows.length === 0 ? 0 : Math.min(...rows.map((r) => r.y));
  const off = (y: number): number => {
    const m = (((y - base) % o.pitch) + o.pitch) % o.pitch;
    return Math.min(m, o.pitch - m);
  };
  const seen = new Map<string, LadderRow>();
  for (const r of rows) {
    const y = Number(r.y.toFixed(4));
    seen.set(`${r.net} ${y}`, { net: r.net, y, offGrid: Number(off(r.y).toFixed(4)) });
  }
  return { gap, pair, ties, offAngle, rows: [...seen.values()].sort((a, b) => a.y - b.y || a.net.localeCompare(b.net)) };
}
