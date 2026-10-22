// key/flex-gap (R1-score-02): the contact.gap interval CHK-KEY-01 names, a
// flex cone's travel held at 35 to 50 percent of cone height and never
// under 1.2 mm (pip-controller bench/part1.html lines 233 and 238, lineage
// pip.bench-part1/haft-9; D-241). The floor and both band ends are the
// profile rows the check reads, key.flexGapFloor, key.flexGapFracMin and
// key.flexGapFracMax, so the param band and the check verdict read the
// same rows. Cone height is the fact coneH when given, else the contact
// feature's coneH. Kernel mesh: the bounds read no material row.

import { qualify, qualifyRow, type Bound, type ConstraintCtx, type ConstraintDef, type ConstraintDim } from "@hackbuild/spec";
import { needFact } from "./common.js";

export const KEY_FLEX_GAP_ID = "key/flex-gap";

/** A flex key's contact gap, the cap travel before it reads, mm. */
export const CONTACT_GAP: ConstraintDim = "contact.gap";

export const FLEX_GAP_FLOOR_ID = "key.flexGapFloor";
export const FLEX_GAP_FRAC_IDS = { lo: "key.flexGapFracMin", hi: "key.flexGapFracMax" } as const;

/** Cone height in mm: the coneH fact, else the contact feature's coneH; absent is E_PARAM_MISSING at /facts/coneH. */
function coneOf(ctx: ConstraintCtx): number {
  const f = ctx.feature;
  if (!Object.hasOwn(ctx.facts, "coneH") && f?.kind === "contact" && typeof f.coneH === "number" && Number.isFinite(f.coneH)) return f.coneH;
  return needFact(ctx, "coneH", KEY_FLEX_GAP_ID);
}

const fmt = (v: number): string => String(Number(v.toFixed(3)));

export const keyFlexGap: ConstraintDef = {
  id: KEY_FLEX_GAP_ID,
  version: "1.0.0",
  dims: [CONTACT_GAP],
  kernels: ["mesh"],
  units: { [CONTACT_GAP]: "mm" },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== CONTACT_GAP) return [];
    const cone = coneOf(ctx);
    const floor = ctx.profile.constant(FLEX_GAP_FLOOR_ID);
    const lo = ctx.profile.constant(FLEX_GAP_FRAC_IDS.lo);
    const hi = ctx.profile.constant(FLEX_GAP_FRAC_IDS.hi);
    return [
      {
        value: floor.value, side: "lo", kernel: "mesh", source: "CHK-KEY-01",
        reason: `contact gap floor ${fmt(floor.value)} mm (${FLEX_GAP_FLOOR_ID}, ${floor.provenance.tier})`,
        ...qualifyRow(floor.provenance.tier),
      },
      {
        value: lo.value * cone, side: "lo", kernel: "mesh", source: "CHK-KEY-01",
        reason: `${fmt(lo.value)} of cone height ${fmt(cone)} mm (${FLEX_GAP_FRAC_IDS.lo}, ${lo.provenance.tier})`,
        ...qualify([lo.provenance.tier]),
      },
      {
        value: hi.value * cone, side: "hi", kernel: "mesh", source: "CHK-KEY-01",
        reason: `${fmt(hi.value)} of cone height ${fmt(cone)} mm, a pressed cone travels about half its height (${FLEX_GAP_FRAC_IDS.hi}, ${hi.provenance.tier})`,
        ...qualify([hi.provenance.tier]),
      },
    ];
  },
};
