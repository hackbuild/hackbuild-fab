// Thin layer flags, SPRUE checkThin (sprue.html:1112 to 1124, lineage
// sprue.bench/inlay-thin): each layer composed alone, raw and cleaned. A
// layer is gone when nothing survives the cleanup, weak when under 75
// percent of its raw cells survive. The flags are build warnings in Part IR
// (D-049), never UI state. Callers pass each layer alone without the coin
// ring, as SPRUE composes a subset without it.

import type { BuildWarning } from "@hackbuild/spec";
import type { LabelGrid } from "../surface.js";
import { hygiene, type RecipeContexts, type RecipeId } from "./recipes.js";

/** Kept fraction under which a layer is weak (sprue.html:1120, `n < raw * 0.75`). */
export const THIN_WEAK_KEPT = 0.75;

export type ThinFlag = "gone" | "weak" | null;

export interface ThinLayer {
  /** JSON pointer to the layer in params, for example "/faces/back/2" */
  readonly param: string;
  /** the layer composed alone, before hygiene */
  readonly raw: LabelGrid;
}

export interface ThinResult {
  readonly param: string;
  readonly flag: ThinFlag;
  /** cells before hygiene, computed */
  readonly raw: number;
  /** cells after hygiene, computed */
  readonly kept: number;
}

const filled = (g: LabelGrid): number => {
  let n = 0;
  for (const v of g.labels) if (v !== 0) n++;
  return n;
};

/** Flag each layer and give the flags as build warnings. */
export function thinFlags<R extends RecipeId>(layers: readonly ThinLayer[], recipe: R, ctx: RecipeContexts[R]): { readonly layers: readonly ThinResult[]; readonly warnings: readonly BuildWarning[] } {
  const results: ThinResult[] = [];
  const warnings: BuildWarning[] = [];
  for (const L of layers) {
    const raw = filled(L.raw);
    const kept = filled(hygiene(L.raw, recipe, ctx));
    const flag: ThinFlag = kept === 0 ? "gone" : raw > 0 && kept < raw * THIN_WEAK_KEPT ? "weak" : null;
    results.push({ param: L.param, flag, raw, kept });
    if (flag === null) continue;
    warnings.push({
      code: flag === "gone" ? "THIN_GONE" : "THIN_WEAK",
      text: `layer ${L.param} ${flag} under the ${recipe} cleanup: ${kept} of ${raw} cells kept (computed), legal at least ${THIN_WEAK_KEPT * 100} percent`,
      param: L.param,
    });
  }
  return { layers: results, warnings };
}
