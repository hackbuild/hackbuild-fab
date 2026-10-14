// Layer audits on sliced masks. Islands port PIP test/islands.py (the
// pip-controller harness, lines 25 to 40): a component of a layer slice
// whose overlap with the slice below is empty is floating, counted when its
// area is over 0.05 mm2. Bridges are new code for CHK-PRT-09, written from
// the SLATE audit as the bench notes describe it (longest continuous run of
// a first layer with nothing underneath, per solid, print pose;
// sources/benches/benches-cases.md line 436), since its script was never
// harvested (line 867).

import type { Grid } from "./slice.js";
import { cellX, cellY } from "./slice.js";

/** islands.py ignores components at or under this area, mm2 (`comp.area() > 0.05`). */
export const ISLAND_MIN_AREA_MM2 = 0.05;

/** Layer mid heights on a preset grid: the first layer, then layer after layer, while the mid stays under zTop, mm. */
export function presetMids(zTop: number, firstLayer: number, layer: number): number[] {
  const out: number[] = [];
  if (firstLayer / 2 < zTop) out.push(firstLayer / 2);
  for (let k = 0; firstLayer + (k + 0.5) * layer < zTop; k++) out.push(firstLayer + (k + 0.5) * layer);
  return out;
}

/** islands.py mid heights: (k + 0.5) x layer while under zTop, mm. */
export function uniformMids(zTop: number, layer: number): number[] {
  const out: number[] = [];
  for (let k = 0; (k + 0.5) * layer < zTop; k++) out.push((k + 0.5) * layer);
  return out;
}

export interface Component {
  readonly cells: readonly number[];
  readonly areaMm2: number;
  /** Centre of the cells, mm. */
  readonly at: readonly [number, number];
}

/** 8-connected components of the set cells. */
export function components(mask: Uint8Array, g: Grid): Component[] {
  const label = new Int32Array(mask.length).fill(-1);
  const out: Component[] = [];
  for (let s = 0; s < mask.length; s++) {
    if (mask[s] !== 1 || label[s] !== -1) continue;
    const cells: number[] = [];
    const stack = [s];
    label[s] = out.length;
    while (stack.length > 0) {
      const c = stack.pop()!;
      cells.push(c);
      const i = c % g.nx, j = (c - i) / g.nx;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= g.nx || jj >= g.ny) continue;
          const n = jj * g.nx + ii;
          if (mask[n] === 1 && label[n] === -1) {
            label[n] = out.length;
            stack.push(n);
          }
        }
      }
    }
    let sx = 0, sy = 0;
    for (const c of cells) {
      const i = c % g.nx;
      sx += cellX(g, i);
      sy += cellY(g, (c - i) / g.nx);
    }
    out.push({ cells, areaMm2: cells.length * g.h * g.h, at: [sx / cells.length, sy / cells.length] });
  }
  return out;
}

/** Components of cur over the area floor that overlap nothing in prev (islands.py `(comp ^ prev).area() < 1e-6`). */
export function floating(cur: Uint8Array, prev: Uint8Array, g: Grid, minAreaMm2 = ISLAND_MIN_AREA_MM2): Component[] {
  return components(cur, g).filter((c) => c.areaMm2 > minAreaMm2 && c.cells.every((k) => prev[k] !== 1));
}

export interface Bridge {
  /** Longest bridging span, mm. */
  readonly spanMm: number;
  /** Cell centre where it was found, mm. */
  readonly at: readonly [number, number];
}

const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]] as const;

/**
 * The longest bridge of a layer: for every unsupported cell (in cur, not in
 * prev) the shortest run through it, along x, y and both diagonals, of
 * unsupported cells whose two ends both abut a supported cell (in cur and
 * in prev); the bridge is the longest of those per-cell spans. A cell with
 * no run anchored at both ends overhangs and is no bridge. A 15.4 x 109 slot
 * reads 15.4 and a 17 mm comb rail between posts reads 17 (SLATE).
 */
export function longestBridge(cur: Uint8Array, prev: Uint8Array, g: Grid): Bridge | null {
  const n = g.nx * g.ny;
  const best = new Float64Array(n).fill(Infinity);
  const state = (i: number, j: number): 0 | 1 | 2 => {
    if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) return 0;
    const c = j * g.nx + i;
    if (cur[c] !== 1) return 0;
    return prev[c] === 1 ? 2 : 1;
  };
  for (const [dx, dy] of DIRS) {
    const step = g.h * Math.hypot(dx, dy);
    for (let j0 = 0; j0 < g.ny; j0++) {
      for (let i0 = 0; i0 < g.nx; i0++) {
        // Walk only from the first cell of each line.
        const pi = i0 - dx, pj = j0 - dy;
        if (pi >= 0 && pj >= 0 && pi < g.nx && pj < g.ny) continue;
        let i = i0, j = j0;
        let runStart = -1;
        let before: 0 | 1 | 2 = 0;
        const run: number[] = [];
        let last: 0 | 1 | 2 = 0;
        while (i >= 0 && j >= 0 && i < g.nx && j < g.ny) {
          const s = state(i, j);
          if (s === 1) {
            if (runStart < 0) {
              runStart = 1;
              before = last;
              run.length = 0;
            }
            run.push(j * g.nx + i);
          } else if (runStart > 0) {
            if (before === 2 && s === 2) {
              const span = run.length * step;
              for (const c of run) if (span < best[c]!) best[c] = span;
            }
            runStart = -1;
          }
          last = s;
          i += dx;
          j += dy;
        }
      }
    }
  }
  let worst = -1;
  let at = 0;
  for (let c = 0; c < n; c++) {
    const b = best[c]!;
    if (Number.isFinite(b) && b > worst) {
      worst = b;
      at = c;
    }
  }
  if (worst < 0) return null;
  const i = at % g.nx;
  return { spanMm: worst, at: [cellX(g, i), cellY(g, (at - i) / g.nx)] };
}
