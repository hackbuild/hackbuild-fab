// The two sheet feature kinds M06-T02 admits (spec/features.ts
// FEATURE_KIND_ADMISSION: finger and flexCut at M06). Both are declarations
// on a sheet body whose outline already carries the cut: the TUMBLER plan
// draws the hinge slots and the finger edge into the part, so the
// generator adds no geometry and owns the host body for its checks.
// flexCut is checked by CHK-SHT-06 (rows at or under 13 deg each), finger
// by CHK-SHT-11 (tab and recess one kerf off the pitch, measured on the
// outline). core registers both under the nest kernel (core/src/kinds.ts).

import { z } from "zod";
import { PROCESSES, type FeatureKindDef, type FeatureOf, type GeneratedGeometry, type KernelCtx, type SchemaLike } from "@hackbuild/spec";

export const SHEET_KIND_VERSION = "1.0.0";

const id = (kind: string) => z.string().regex(new RegExp(`^${kind}\\.[a-z0-9][a-z0-9.-]*$`));
const mm = z.number().finite();
const vec2 = z.tuple([mm, mm]).readonly();
const base = {
  body: z.string().min(1).exactOptional(),
  note: z.string().exactOptional(),
  drivenBy: z.record(z.string(), z.string()).readonly().exactOptional(),
};

export const flexCutSchema = z.object({
  kind: z.literal("flexCut"), id: id("flexCut"), ...base,
  rows: z.number().int().positive(), degPerRow: z.number().finite().nonnegative(),
  slotLen: mm.positive(), landLen: mm.nonnegative(), pitch: mm.positive(),
}).strict().readonly();

export const fingerSchema = z.object({
  kind: z.literal("finger"), id: id("finger"), ...base,
  count: z.number().int().positive(), width: mm.positive(),
  processA: z.enum(PROCESSES), processB: z.enum(PROCESSES),
  burn: mm.exactOptional(),
  edge: z.object({ from: vec2, to: vec2 }).strict().readonly().exactOptional(),
}).strict().readonly();

/** No geometry: the cut is in the host outline; the feature owns the host volume for its checks. */
function declaration(_f: unknown, ctx: KernelCtx): GeneratedGeometry {
  return { preUnionCutters: [], positives: [], postUnionCutters: [], bodies: [], owns: { volume: ctx.body.id } };
}

export const flexCutKind: FeatureKindDef<"flexCut"> = {
  kind: "flexCut",
  version: SHEET_KIND_VERSION,
  schema: flexCutSchema as unknown as SchemaLike<unknown, FeatureOf<"flexCut">>,
  generate: declaration,
  checks: ["CHK-SHT-06"],
  fit: "none",
  reference: ["mechanisms/living-hinge"],
  planes: ["XY"],
  routes: ["prism"],
};

export const fingerKind: FeatureKindDef<"finger"> = {
  kind: "finger",
  version: SHEET_KIND_VERSION,
  schema: fingerSchema as unknown as SchemaLike<unknown, FeatureOf<"finger">>,
  generate: declaration,
  checks: ["CHK-SHT-11"],
  fit: "none",
  reference: ["joints/finger"],
  planes: ["XY"],
  routes: ["prism"],
};

/** The sheet kinds this package ships, for core's kernel table. */
export const SHEET_KINDS = [flexCutKind, fingerKind] as const;
