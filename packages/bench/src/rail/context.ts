// What every row of one rail reads besides its own value: the param
// envelope of the last build (constraints.query in param form, M01) and the
// metrics derived rows show. ParamRail provides it once; rows inject it.

import type { InjectionKey, Ref } from "vue";
import type { Metric, ParamEnvelope, ParamField, ParamPointer } from "@hackbuild/spec";
import type { ArtDocController } from "@hackbuild/bench-core";
import { bandOf, legalLine, type Band } from "./model.js";

export type CommitKind = "touch" | "commit" | "light";

/** One edit a row asks for: a dotted core path, the new value, and how it commits. */
export type Edit = [path: string, value: unknown, kind: CommitKind];

export interface RailContext {
  readonly envelope: Ref<ParamEnvelope | null>;
  readonly metrics: Ref<ReadonlyMap<string, Metric>>;
}

export const RAIL: InjectionKey<RailContext> = Symbol("hbf-rail");

/** The art controller of an `art` param by field id (bench-core ChaseBinding.art); a row without one makes its own from its value. */
export type ArtHost = (id: string) => ArtDocController | null;
export const ART_HOST: InjectionKey<ArtHost> = Symbol("hbf-art-host");

/** The field id of the art param whose canvas the stage is showing; its rail row then drops the canvas and keeps the layer list and fields. */
export const ART_STAGE: InjectionKey<Ref<string | null>> = Symbol("hbf-art-stage");

/** The save-offline action of the export panel: whether it can run, why not, and the press. */
export interface OfflineHost {
  readonly ok: boolean;
  readonly why: string;
  readonly busy: boolean;
  /** The line after a save, or after a refusal. */
  readonly note: string;
  run(): void;
}
export const OFFLINE: InjectionKey<OfflineHost> = Symbol("hbf-offline");

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
