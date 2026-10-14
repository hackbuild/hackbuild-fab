// Rail data that is not visibility: field defaults, control choice, legal
// bands and legal enum options (M09-T08 steps 1, 4 and 5).
//
// defaultsOf repeats core/src/commands/build.ts `defaultsOf` because that
// module reads node:fs and cannot enter a bake; test/rail.test.ts compares
// both on the flex-pair chase so the two cannot drift.

import type { Bound, ParamEnvelope, ParamField, ParamGroup, ParamPointer } from "@hackbuild/spec";

export type Values = Record<string, unknown>;
export type ListField = Extract<ParamField, { readonly type: "list" }>;
export type EnumField = Extract<ParamField, { readonly type: "enum" }>;
export type NumericField = Extract<ParamField, { readonly range: readonly [number, number] }>;

const inputFields = (fields: readonly ParamField[]): ParamField[] => fields.filter((f) => f.type !== "derived");

function fieldDefault(f: ParamField): unknown {
  if (f.type === "list") {
    const item = itemDefaults(f.item);
    return Array.from({ length: f.min }, () => ({ ...item }));
  }
  return "default" in f ? f.default : undefined;
}

/** Defaults of `fields`; a list takes `min` instances at the item defaults. */
export function itemDefaults(fields: readonly ParamField[]): Values {
  const out: Values = {};
  for (const f of inputFields(fields)) {
    const d = fieldDefault(f);
    if (d !== undefined) out[f.id] = d;
  }
  return out;
}

/** Defaults of every input field of every group. */
export function defaultsOf(groups: readonly ParamGroup[]): Values {
  return itemDefaults(groups.flatMap((g) => g.fields));
}

export const NUMERIC: ReadonlySet<ParamField["type"]> = new Set(["mm", "deg", "ratio", "number", "int"]);
export const isNumeric = (f: ParamField): f is NumericField => NUMERIC.has(f.type);

/** At most this many enum options render as chips; more render as a select (PIP: shape and group type chips, pin map selects). */
export const CHIP_MAX = 4;
/** An int field whose span is under this renders a range as well as its number. */
export const INT_RANGE_SPAN = 50;

/** Unit span after the value. */
export function unitOf(f: ParamField): string {
  if (f.type === "mm") return "mm";
  if (f.type === "deg") return "deg";
  if (f.type === "number") return f.unit;
  if (f.type === "derived") return f.unit ?? "";
  return "";
}

/**
 * Slider step. `step: "layer"` in the card means the machine layer; the
 * spec types step as a number, so a layer step is the number the chase
 * writes, read from the machine profile by whoever wrote the chase.
 */
export function stepOf(f: NumericField): number {
  return f.step ?? (f.type === "int" ? 1 : 0.01);
}

/** Effective [floor, ceiling] and the binding bound on each side, or null when the envelope has no interval for the pointer. */
export interface Band {
  readonly lo: number | null;
  readonly hi: number | null;
  readonly loBy: Bound | null;
  readonly hiBy: Bound | null;
  readonly unsat: boolean;
}

export function bandOf(env: ParamEnvelope | null, pointer: ParamPointer): Band | null {
  const iv = env?.params[pointer];
  if (iv === undefined) return null;
  const by = (side: readonly Bound[], idx: readonly number[]): Bound | null => {
    const i = idx[0];
    return i === undefined ? null : side[i] ?? null;
  };
  return {
    lo: iv.legal?.[0] ?? null,
    hi: iv.legal?.[1] ?? null,
    loBy: by(iv.lo, iv.binding.lo),
    hiBy: by(iv.hi, iv.binding.hi),
    unsat: iv.legal === null,
  };
}

const num = (v: number): string => String(Number(v.toFixed(4)));
const who = (b: Bound): string => b.source ?? b.kernel;

/** Tooltip line for a band: `legal 1.28 to 1.60, set by <constraint>`, numbers from the query result. */
export function legalLine(band: Band, dim: string): string {
  if (band.unsat) return `no legal value, ${dim} floors exceed its ceilings`;
  const lo = band.lo === null ? "unbounded" : num(band.lo);
  const hi = band.hi === null ? "unbounded" : num(band.hi);
  const set = [band.loBy, band.hiBy].filter((b): b is Bound => b !== null).map(who);
  const uniq = [...new Set(set)];
  return `legal ${lo} to ${hi}${uniq.length > 0 ? `, set by ${uniq.join(" and ")}` : ""}`;
}

/** Band as fractions of the field range for the track overlay, clamped to 0 to 1. */
export function bandSpan(band: Band, f: NumericField): { readonly from: number; readonly to: number } {
  const [a, b] = f.range;
  const w = b - a || 1;
  const clamp = (x: number): number => Math.min(1, Math.max(0, x));
  return { from: clamp(((band.lo ?? a) - a) / w), to: clamp(((band.hi ?? b) - a) / w) };
}

/**
 * Options an enum offers (D-125): with a constraintDim and an interval in
 * the envelope, an option whose value reads as a number outside the legal
 * band is never offered. Options that do not read as numbers stay; the
 * interval says nothing about them.
 */
export function legalOptions(f: EnumField, band: Band | null): EnumField["options"] {
  if (band === null) return f.options;
  if (band.unsat) return [];
  return f.options.filter((o) => {
    const v = Number(o.value);
    if (o.value.trim() === "" || !Number.isFinite(v)) return true;
    return (band.lo === null || v >= band.lo) && (band.hi === null || v <= band.hi);
  });
}

/** JSON pointer of a field: `/W`, or `/keys/0/gap` inside list instance 0. */
export function pointerOf(id: string, list?: { readonly id: string; readonly index: number }): ParamPointer {
  return list === undefined ? `/${id}` : `/${list.id}/${list.index}/${id}`;
}

/** Dotted path the bench core reads and writes: `W`, `keys.0.gap`. */
export function pathOf(id: string, list?: { readonly id: string; readonly index: number }): string {
  return list === undefined ? id : `${list.id}.${list.index}.${id}`;
}
