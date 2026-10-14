// CHK-INL-02 despeckle at 0.35 x min-feature disc area (CHECKS.md 6,
// version 1.0.1: origin corrected to COLLAR v3, whose despeckle at the full
// disc ate the full stop of hack.build). Measured: the smallest 4-connected
// island of any art slot on either face after hygiene, mm2. Legal: at least
// factor x pi x (minF / 2)^2 mm2, the factor from profile despeckle.factor
// (D-145). An island under it is a speck the slicer drops or smears; this
// check warns and never blocks.

import type { CheckCtx, Finding, Part } from "@hackbuild/spec";
import { artFaces, artOf } from "../kind.js";
import { despeckleFactor, islandSizes } from "../hygiene/despeckle.js";
import type { LabelGrid } from "../surface.js";
import { distinctArts, hostOf, minFeatureOf, tidy } from "./common.js";

export const CHK_INL_02 = "CHK-INL-02" as const;
export const CHK_INL_02_VERSION = "1.0.1";

/** CHK-INL-02 on one label grid, without a Part: what the eval harness and the run body share. */
export interface Inl02GridCtx {
  /** stroke floor, mm */
  readonly minF: number;
  /** profile despeckle.factor */
  readonly despeckleFactor: number;
  /** the slot art is carved from, never measured; 0 is never measured either */
  readonly host?: number;
}

export interface Inl02Grid {
  /** skip when no slot cell is painted */
  readonly verdict: "pass" | "warn" | "skip";
  /** smallest surviving island, mm2; null on a skip */
  readonly measured: number | null;
  /** legal floor, mm2: factor x pi x (minF / 2)^2 */
  readonly lo: number;
  readonly smallestCells: number | null;
  readonly slot: number | null;
}

/** The CHK-INL-02 floor, mm2. */
export function inl02Floor(minF: number, despeckleFactor: number): number {
  return tidy(despeckleFactor * Math.PI * (minF / 2) ** 2, 6);
}

/** Smallest 4-connected island of any slot but the host; the first in scan order wins a tie. */
export function checkInl02(grid: LabelGrid, ctx: Inl02GridCtx): Inl02Grid {
  const { w, h, res } = grid;
  const lo = inl02Floor(ctx.minF, ctx.despeckleFactor);
  let smallest = Infinity, slot = 0;
  for (const [s, sizes] of islandSizes(grid.labels, w, h)) {
    if (s === ctx.host) continue;
    for (const n of sizes) if (n < smallest) { smallest = n; slot = s; }
  }
  if (smallest === Infinity) return { verdict: "skip", measured: null, lo, smallestCells: null, slot: null };
  const measured = tidy(smallest / (res * res), 6);
  return { verdict: measured >= lo ? "pass" : "warn", measured, lo, smallestCells: smallest, slot };
}

export function runInl02(t: { readonly part: Part }, ctx: CheckCtx): readonly Finding[] {
  const out: Finding[] = [];
  const factor = despeckleFactor(ctx.profile);
  for (const f of distinctArts(t.part)) {
    const host = hostOf(t.part, f, ctx);
    const faces = artFaces(artOf(f));
    const { minF } = minFeatureOf(f, ctx);
    const res = faces.top.art.res;
    const top = checkInl02(faces.top.art, { minF, despeckleFactor: factor, host: host.slot });
    const bed = checkInl02(faces.bed.art, { minF, despeckleFactor: factor, host: host.slot });
    const [r, face] = bed.smallestCells !== null && (top.smallestCells === null || bed.smallestCells < top.smallestCells) ? [bed, "bed"] : [top, "top"];
    const target = { level: "part" as const, part: t.part.id };
    if (r.verdict === "skip" || r.measured === null) {
      out.push({ verdict: "skip", target, measured: "no art cells", legal: { kind: "none" }, constraint: `art ${f.art} paints no slot cell; nothing to despeckle` });
      continue;
    }
    out.push({
      verdict: r.verdict,
      target, measured: r.measured,
      legal: { kind: "interval", lo: r.lo, hi: null, unit: "mm2", nearest: Math.max(r.measured, r.lo) },
      constraint: `an island under ${factor} (profile despeckle.factor, inferred) x a ${minF} mm min-feature disc is a speck that will not print; D-145 keeps the full stop, which the full disc removed`,
      extra: { art: f.art, smallestCells: r.smallestCells!, slot: r.slot!, face, cellMm2: tidy(1 / (res * res), 9) },
    });
  }
  return out;
}
