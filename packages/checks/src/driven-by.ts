// Which params drive a check's measured value (M04-T04 step 1, D-064,
// api-library-ai-design.md 8.7): the JSON pointers into the chase params
// whose change moves it. Three sources, first non-empty wins:
//   module   the check module's own drivenBy (a feature-level check reads
//            the pointers build.ts bound through Author.bind)
//   metric   the drivenBy of the part metrics this check gates (D-075):
//            the kernel knows them for every gated metric (8.7)
//   dim      byConstraintDim: every ParamField whose constraintDim is a
//            dim of the ConstraintDef the check is backed by
// A check with no dim, or a dim no ParamField declares, has an empty
// drivenBy; its finding has no fix and next names constraints.query.

import type {
  AnyCheckDef, CheckTarget, ConstraintDef, ConstraintDim, ParamField, ParamGroup, ParamPointer,
} from "@hackbuild/spec";
import { checkError } from "./skeleton/common.js";

/** One settable pointer of the chase at the given values. */
export interface ParamSlot {
  readonly pointer: ParamPointer;
  readonly field: ParamField;
}

/** Every param pointer the chase declares at these values: `/<field>` and `/<list>/<i>/<item>`. */
export function paramSlots(params: readonly ParamGroup[], values: Readonly<Record<string, unknown>>): ParamSlot[] {
  const out: ParamSlot[] = [];
  for (const g of params) {
    for (const f of g.fields) {
      if (f.type === "list") {
        const items = values[f.id];
        const n = Array.isArray(items) ? items.length : 0;
        for (let i = 0; i < n; i += 1) for (const it of f.item) out.push({ pointer: `/${f.id}/${i}/${it.id}`, field: it });
      } else out.push({ pointer: `/${f.id}`, field: f });
    }
  }
  return out;
}

/** The constraint dim a field sets, if any. */
export const dimOf = (f: ParamField): ConstraintDim | undefined => ("constraintDim" in f ? f.constraintDim : undefined);

export type NumericField = Extract<ParamField, { readonly range: readonly [number, number] }>;

/** The numeric field a pointer such as /keys/0/gap names: a top field, or a list item field. */
export function fieldAt(params: readonly ParamGroup[], pointer: string): NumericField | undefined {
  const segs = pointer.split("/").slice(1);
  const top = params.flatMap((g) => g.fields).find((f) => f.id === segs[0]);
  const leaf = top !== undefined && top.type === "list" && /^\d+$/.test(segs[1] ?? "") && segs.length === 3
    ? top.item.find((f) => f.id === segs[2])
    : segs.length === 1 ? top : undefined;
  return leaf !== undefined && "range" in leaf ? leaf : undefined;
}

/** The value at a pointer, undefined when the path does not exist. */
export function valueAt(values: Readonly<Record<string, unknown>>, pointer: string): unknown {
  let at: unknown = values;
  for (const s of pointer.split("/").slice(1)) {
    if (typeof at !== "object" || at === null) return undefined;
    at = (at as Record<string, unknown>)[s];
  }
  return at;
}

/** Values with one pointer set; values are JSON. */
export function withValue(values: Readonly<Record<string, unknown>>, pointer: string, v: number): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(values)) as Record<string, unknown>;
  const segs = pointer.split("/").slice(1);
  let at: unknown = out;
  for (const s of segs.slice(0, -1)) at = (at as Record<string, unknown>)[s];
  const last = segs[segs.length - 1];
  if (typeof at !== "object" || at === null || last === undefined) {
    throw checkError({ code: "E_PARAM_MISSING", path: pointer, hint: `no param value at ${pointer}`, record: "verification" });
  }
  (at as Record<string, unknown>)[last] = v;
  return out;
}

/** The default drivenBy: the pointers of every ParamField whose constraintDim is one of dims, in declaration order. */
export function byConstraintDim(dims: readonly ConstraintDim[]): (params: readonly ParamGroup[], values: Readonly<Record<string, unknown>>) => ParamPointer[] {
  return (params, values) => paramSlots(params, values).filter((s) => {
    const d = dimOf(s.field);
    return d !== undefined && dims.includes(d);
  }).map((s) => s.pointer);
}

/** The chase side drivenBy reads: params, the values this build ran with, and the registered ConstraintDefs. */
export interface DrivenSources {
  readonly params: readonly ParamGroup[];
  readonly values: Readonly<Record<string, unknown>>;
  readonly constraints: readonly ConstraintDef[];
}

export interface Driven {
  /** Sorted, unique. */
  readonly pointers: readonly string[];
  /** Dims of the ConstraintDef behind the check; empty when it names none. */
  readonly dims: readonly ConstraintDim[];
  readonly from: "module" | "metric" | "dim" | "none";
}

const sortedUnique = (xs: readonly string[]): string[] => [...new Set(xs)].sort();

/** The dims of the ConstraintDef a check names in CheckDef.constraint. */
export function dimsOfCheck(def: Pick<AnyCheckDef, "constraint">, constraints: readonly ConstraintDef[]): readonly ConstraintDim[] {
  return def.constraint === undefined ? [] : constraints.find((c) => c.id === def.constraint)?.dims ?? [];
}

/** drivenBy(target, chase): the pointers that move the measured value, and where they came from. */
export function drivenPointers(def: AnyCheckDef, target: CheckTarget, src: DrivenSources): Driven {
  const dims = dimsOfCheck(def, src.constraints);
  const own = (def.drivenBy as ((t: CheckTarget) => readonly string[]) | undefined)?.(target) ?? [];
  if (own.length > 0) return { pointers: sortedUnique(own), dims, from: "module" };
  if (target.level === "part") {
    const gated = target.part.metrics.filter((m) => m.gate === def.id).flatMap((m) => m.drivenBy ?? []);
    if (gated.length > 0) return { pointers: sortedUnique(gated), dims, from: "metric" };
  }
  const byDim = byConstraintDim(dims)(src.params, src.values);
  return byDim.length > 0 ? { pointers: sortedUnique(byDim), dims, from: "dim" } : { pointers: [], dims, from: "none" };
}
