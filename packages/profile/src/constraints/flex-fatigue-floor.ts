// profile/flex-fatigue-floor (M01-T06): a conductive PLA trace that flexes
// across layer lines cracks below a minimum width. Present only when the
// query declares flexes true. The row is <family>.flexFatigueWidthMin,
// family being the material id before its first hyphen (cpla-protopasta
// reads cpla), so both cPLA rows share the one fatigue row PROFILE.md 3.3
// holds; a family with no row has no fatigue floor.

import { isThrownCommandError, qualifyRow, type Bound, type Constant, type ConstraintCtx, type ConstraintDef } from "@hackbuild/spec";

const DIM = "conductor.width" as const;

/** The material family a fatigue row is keyed by: the id before its first hyphen. */
export const materialFamily = (material: string): string => material.split("-")[0]!;

/** The family's fatigue row, or null when profile holds none (E_REF only; any other error propagates). */
function fatigueRow(ctx: ConstraintCtx): Constant | null {
  try {
    return ctx.profile.constant(`${materialFamily(ctx.material)}.flexFatigueWidthMin`);
  } catch (e) {
    if (isThrownCommandError(e) && e.hbf.code === "E_REF") return null;
    throw e;
  }
}

export const flexFatigueFloor: ConstraintDef = {
  id: "profile/flex-fatigue-floor",
  version: "1.0.0",
  dims: [DIM],
  kernels: ["profile"],
  units: { [DIM]: "mm" },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== DIM || ctx.facts["flexes"] !== true) return [];
    const row = fatigueRow(ctx);
    if (row === null) return [];
    return [{
      value: row.value,
      side: "lo",
      kernel: "profile",
      reason: `fatigue, ${materialFamily(ctx.material)} across layer lines under flex`,
      source: row.id,
      ...qualifyRow(row.provenance.tier),
    }];
  },
};
