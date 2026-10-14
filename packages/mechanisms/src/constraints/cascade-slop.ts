// mech/cascade-slop (M01-T10 step 1, plan-deltas R56): the TUMBLER bench
// budget on a chain of laser-cut gate blocks, ported from the canonical
// tumbler.html (lineage tumbler.bench/harvest), lines 2108 to 2112. Each
// stage adds one kerf k and one fit clearance c of slop, so a chain of
// depth n stacks n (k + c); over cascade.slopWarn the bench shows "deep
// chain, add a restoring lever", and the input stroke needed is n times
// cascade.strokePerStage. depthOf (lines 2015 to 2024) gives 0 to a block
// with no input wire, the floor. The ceiling is the deepest whole chain
// inside the budget, slopWarn / (k + c), snapped down by the solver's one
// grid. Severity warn (D-067): the bench warns and never refuses.
// The code is linear in depth; the WHIFFLETREE note at line 1385 says slop
// doubles per stage. The fixture follows the code (README).

import { qualify, type Bound, type ConstraintCtx, type ConstraintDef, type ConstraintDim, type Qualified, type Severity } from "@hackbuild/spec";
import { needNonNegative } from "@hackbuild/spec";

export const CASCADE_SLOP_ID = "mech/cascade-slop";

/** Gate blocks in the longest wire chain, a whole count. */
export const CASCADE_DEPTH: ConstraintDim = "cascade.depth";

/** TUMBLER warns and never refuses. */
export const CASCADE_SEVERITY: Severity = "warn";

/** The bench's warn text, tumbler.html line 2112. */
export const CASCADE_WARN_TEXT = "deep chain, add a restoring lever";

export const SLOP_WARN_ID = "cascade.slopWarn";
export const STROKE_PER_STAGE_ID = "cascade.strokePerStage";

/** Kerf k and fit c per stage, mm, from facts kerf and fit. */
function perStage(ctx: ConstraintCtx): { readonly k: number; readonly c: number } {
  return { k: needNonNegative(ctx, "kerf", CASCADE_SLOP_ID), c: needNonNegative(ctx, "fit", CASCADE_SLOP_ID) };
}

/** What the bench status line reads at a depth: stacked slop and input stroke, each computed. */
export interface CascadeReadout {
  readonly slop: Qualified;
  readonly stroke: Qualified;
}

export function cascadeReadout(depth: number, ctx: ConstraintCtx): CascadeReadout {
  const { k, c } = perStage(ctx);
  const per = ctx.profile.constant(STROKE_PER_STAGE_ID);
  return {
    slop: { value: depth * (k + c), unit: "mm", source: CASCADE_SLOP_ID, ...qualify([]) },
    stroke: { value: depth * per.value, unit: "mm", source: STROKE_PER_STAGE_ID, ...qualify([per.provenance.tier]) },
  };
}

export const cascadeSlop: ConstraintDef = {
  id: CASCADE_SLOP_ID,
  version: "1.0.0",
  dims: [CASCADE_DEPTH],
  kernels: ["motion"],
  units: { [CASCADE_DEPTH]: "stages" },
  steps: { [CASCADE_DEPTH]: 1 },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== CASCADE_DEPTH) return [];
    const { k, c } = perStage(ctx);
    const warn = ctx.profile.constant(SLOP_WARN_ID);
    const floor: Bound = {
      value: 0, side: "lo", kernel: "motion",
      reason: "a block with no input wire has depth 0 (TUMBLER depthOf)",
      source: CASCADE_SLOP_ID, ...qualify([]),
    };
    // Zero slop per stage stacks nothing, so no depth reaches the warn.
    if (k + c === 0) return [floor];
    return [floor, {
      value: warn.value / (k + c), side: "hi", kernel: "motion",
      reason: `stacked slop over ${warn.value.toFixed(1)} mm reads "${CASCADE_WARN_TEXT}", at kerf ${k.toFixed(2)} plus fit ${c.toFixed(2)} mm per stage (${SLOP_WARN_ID}, ${warn.provenance.tier})`,
      source: CASCADE_SLOP_ID, ...qualify([warn.provenance.tier]),
    }];
  },
};
