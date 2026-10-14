// What every row of one rail reads besides its own value: the param
// envelope of the last build (constraints.query in param form, M01) and the
// metrics derived rows show. ParamRail provides it once; rows inject it.

import type { InjectionKey, Ref } from "vue";
import type { Metric, ParamEnvelope, ParamField, ParamPointer } from "@hackbuild/spec";
import { bandOf, legalLine, type Band } from "./model.js";

export type CommitKind = "touch" | "commit" | "light";

/** One edit a row asks for: a dotted core path, the new value, and how it commits. */
export type Edit = [path: string, value: unknown, kind: CommitKind];

export interface RailContext {
  readonly envelope: Ref<ParamEnvelope | null>;
  readonly metrics: Ref<ReadonlyMap<string, Metric>>;
}

export const RAIL: InjectionKey<RailContext> = Symbol("hbf-rail");

/** How a settled edit commits: the field's declared commit, else a rebuild. */
export const settleKind = (f: ParamField): CommitKind => f.commit ?? "commit";

/** Band for a field that declares a constraintDim; null otherwise. */
export function fieldBand(ctx: RailContext | undefined, f: ParamField, pointer: ParamPointer): Band | null {
  if (f.constraintDim === undefined || ctx === undefined) return null;
  return bandOf(ctx.envelope.value, pointer);
}

/** Tooltip and aria description: the help line, then the binding bound. */
export function describe(f: ParamField, band: Band | null): string {
  const parts = [f.help, band !== null && f.constraintDim !== undefined ? legalLine(band, f.constraintDim) : undefined];
  return parts.filter((x): x is string => x !== undefined && x !== "").join(". ");
}
