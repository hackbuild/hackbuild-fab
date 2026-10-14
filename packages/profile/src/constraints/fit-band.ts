// profile/fit-band (M01-T09, D-099, D-100): a fit class bounds the drawn
// clearance across a joint and, given the shaft, the hole. Facts: fitClass
// (a profile class id), fitModel (a legacy model id; absent reads the D-100
// loss table) and shaftMm for fit.hole, plus layerMm for the loss row pick.
//
// Legacy model: the band ends as the bench drew them (ogee16-fits-v1, drawn
// across the joint). D-100: drawnFor inverts realGap over the loss rows the
// class's process pair picks, per side, doubled to the joint; a pair with
// no loss row gives no bound.

import { commandError, qualifyRow, type Bound, type ConstraintCtx, type ConstraintDef, type FitClassId, type Tier } from "@hackbuild/spec";
import { sideOf } from "../fits.js";
import { fitModel, legacyBand } from "../fits/ogee16-fits-v1.js";

const DRAWN = "fit.drawn" as const;
const HOLE = "fit.hole" as const;

function stringFact(ctx: ConstraintCtx, key: string, expected: string): string {
  const v = ctx.facts[key];
  if (typeof v !== "string" || v === "") {
    throw commandError({ code: "E_PARAM_MISSING", path: `/facts/${key}`, ...(v === undefined ? {} : { got: v }), expected, hint: `pass facts ${key}=<${expected}>` });
  }
  return v;
}

/** [lo, hi] drawn across the joint, mm, the reason line and the tier, or null when no loss row prices the pair. */
function drawnBand(ctx: ConstraintCtx): { readonly lo: number; readonly hi: number; readonly reason: string; readonly source: string; readonly tier: Tier } | null {
  const cls = stringFact(ctx, "fitClass", "a profile fit class id");
  const model = ctx.facts["fitModel"];
  if (model !== undefined) {
    const m = fitModel(String(model));
    const b = legacyBand(m, cls);
    const named = b.legacyClass === b.class ? b.class : `${b.class} (was ${b.legacyClass})`;
    return {
      lo: b.lo, hi: b.hi, tier: b.provenance.tier, source: m.id,
      reason: `${named} ${b.meaning}, ${m.id} band, method ${b.provenance.method}`,
    };
  }
  const band = ctx.profile.fit(cls as FitClassId);
  const side = sideOf(band);
  if (side === null) return null;
  const layer = ctx.facts["layerMm"];
  const ends = ctx.profile.drawnFor(band.class, side, ctx.machine, ctx.material, typeof layer === "number" ? layer : undefined);
  if (ends === null) return null;
  return {
    lo: 2 * ends[0], hi: 2 * ends[1], tier: band.provenance.tier, source: "fits.json",
    reason: `${band.class} ${band.note}, real band inverted over the ${side} loss row, ${ctx.material} on ${ctx.machine}`,
  };
}

export const fitBand: ConstraintDef = {
  id: "profile/fit-band",
  version: "1.0.0",
  dims: [DRAWN, HOLE],
  kernels: ["profile"],
  units: { [DRAWN]: "mm", [HOLE]: "mm" },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== DRAWN && dim !== HOLE) return [];
    const b = drawnBand(ctx);
    if (b === null) return [];
    const shaft = dim === HOLE ? ctx.facts["shaftMm"] : 0;
    if (typeof shaft !== "number" || !Number.isFinite(shaft)) {
      throw commandError({ code: "E_PARAM_MISSING", path: "/facts/shaftMm", ...(shaft === undefined ? {} : { got: shaft }), expected: "the shaft diameter, mm", hint: "pass facts shaftMm=<mm> to bound the hole" });
    }
    const base = shaft;
    const what = dim === HOLE ? `shaft ${base} mm plus ` : "";
    const q = qualifyRow(b.tier);
    return [
      { value: base + b.lo, side: "lo", kernel: "profile", reason: `${what}${b.reason}`, source: b.source, ...q },
      { value: base + b.hi, side: "hi", kernel: "profile", reason: `${what}${b.reason}`, source: b.source, ...q },
    ];
  },
};
