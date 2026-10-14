// Despeckle: drop 4-connected islands under a cell count. One flood fill
// serves both legacy forms: COLLAR clears a binary slot mask
// (collar.html:968 to 985, lineage collar.bench/inlay-hygiene-despeckle) and
// print-forge hands an island of slot S back to the host slot
// (rastermesh.js:293 to 309, lineage inlay.hygiene-print-forge). Island
// membership does not depend on visit order, and a removed island never
// joins a later one, so both forms share the walk.
//
// The threshold is 0.35 of the area of a disc whose diameter is the min
// feature (D-145): at the full disc COLLAR v3 ate the full stop of
// hack.build (knowledge/kernels/art-inlay.md). The factor is profile
// constant despeckle.factor, read by the caller through despeckleFactor.

import { commandError, type ProfileLookup } from "@hackbuild/spec";

/** Profile constant holding the despeckle factor, a fraction of a min-feature disc. */
export const DESPECKLE_FACTOR_ID = "despeckle.factor";

/** The despeckle factor from profile; a value outside (0, 1] is E_SCHEMA. */
export function despeckleFactor(profile: Pick<ProfileLookup, "constant">): number {
  const c = profile.constant(DESPECKLE_FACTOR_ID);
  if (!Number.isFinite(c.value) || !(c.value > 0) || c.value > 1) {
    throw commandError({
      code: "E_SCHEMA", path: `/constants/${c.id}`, got: c.value, expected: "a fraction in (0, 1]",
      hint: `set profile constant ${c.id} to a fraction of a min-feature disc`,
    });
  }
  return c.value;
}

/**
 * Islands under this many cells are removed: round(factor x pi x (minF / 2 x res)^2),
 * the print-forge form (INLAY part2.js:209). minF in mm, res in cells per mm.
 */
export function despeckleCells(minF: number, res: number, factor: number): number {
  return Math.round(factor * Math.PI * Math.pow((minF / 2) * res, 2));
}

/**
 * Visit each 4-connected island of cells where `inside(p)` holds, in scan
 * order of its first cell. `visit` may change the grid for the island it
 * gets; cells already walked are never walked again.
 */
export function forEachIsland(w: number, h: number, inside: (p: number) => boolean, visit: (cells: readonly number[]) => void): void {
  const n = w * h, seen = new Uint8Array(n), stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (seen[s] || !inside(s)) continue;
    let top = 0;
    stack[top++] = s;
    seen[s] = 1;
    const cells: number[] = [];
    while (top > 0) {
      const p = stack[--top]!;
      cells.push(p);
      const i = p % w, j = (p - i) / w;
      if (i > 0 && !seen[p - 1] && inside(p - 1)) { seen[p - 1] = 1; stack[top++] = p - 1; }
      if (i < w - 1 && !seen[p + 1] && inside(p + 1)) { seen[p + 1] = 1; stack[top++] = p + 1; }
      if (j > 0 && !seen[p - w] && inside(p - w)) { seen[p - w] = 1; stack[top++] = p - w; }
      if (j < h - 1 && !seen[p + w] && inside(p + w)) { seen[p + w] = 1; stack[top++] = p + w; }
    }
    visit(cells);
  }
}

/** COLLAR form: clear islands of a 0/1 mask under `minCells`, in place; returns the mask. */
export function despeckleMask(mask: Uint8Array, w: number, h: number, minCells: number): Uint8Array {
  forEachIsland(w, h, (p) => mask[p] !== 0, (cells) => {
    if (cells.length < minCells) for (const c of cells) mask[c] = 0;
  });
  return mask;
}

/** print-forge form: islands of slot `slot` under `minCells` become `into`, in place; returns the islands removed. */
export function despeckleLabels(labels: Uint8Array, w: number, h: number, slot: number, minCells: number, into: number): number {
  let removed = 0;
  forEachIsland(w, h, (p) => labels[p] === slot, (cells) => {
    if (cells.length >= minCells) return;
    for (const c of cells) labels[c] = into;
    removed++;
  });
  return removed;
}

/** 4-connected island sizes per non-zero slot, each list in scan order of the island's first cell. */
export function islandSizes(labels: Uint8Array, w: number, h: number): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (let s = 0; s < w * h; s++) {
    const v = labels[s]!;
    if (v !== 0 && !out.has(v)) out.set(v, []);
  }
  for (const [slot, sizes] of out) forEachIsland(w, h, (p) => labels[p] === slot, (cells) => { sizes.push(cells.length); });
  return out;
}
