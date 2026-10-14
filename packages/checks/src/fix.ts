// Fix from the solver with a predicted verdict (M04-T04 step 3, D-064,
// api-library-ai-design.md 6.1). A failing finding whose measured value
// exactly one param drives gets the param's nearest legal value as `set`;
// the design is rebuilt in memory with that value, the same check runs on
// the new Part IR, and `predicts` carries that run's measured value and
// verdict, with the predicted build's hash in extra.predictedBuild. With
// no driving pointer or more than one, no fix: next names
// constraints.query for the pointers and dims involved. A fix never
// touches geometry; `param` is always a pointer into params (step 4).
//
// The param's legal interval comes from the solver (ConstraintSolver
// forParams for the pointer's dim, read with the build's facts). A check
// that measures the driving param itself takes its own legal values
// instead, so the fix and the verdict read the same bound. Either way the
// interval is clipped to the field range and rounded inward onto the
// field's step grid, counted from the range minimum (G-09).

import type { ConstraintDim, Finding, Fix, NextCall, ParamGroup, Verdict } from "@hackbuild/spec";
import { fieldAt, valueAt, withValue, type NumericField } from "./driven-by.js";
import { gridInterval, nearestInterval, nearestMultiple, nearestSet, tidy } from "./nearest.js";

/** One rebuilt-and-rerun outcome: the same check's finding on the same target, and the predicted build's hash. */
export interface Prediction {
  readonly finding: Pick<Finding, "verdict" | "measured">;
  readonly buildHash: string;
}

export interface FixInput {
  /** drivenBy pointers for this target (driven-by.ts). */
  readonly pointers: readonly string[];
  /** Dims behind the check, for next when no fix is offered. */
  readonly dims: readonly ConstraintDim[];
  readonly params: readonly ParamGroup[];
  /** Param values this build ran with. */
  readonly values: Readonly<Record<string, unknown>>;
  /** True when the measured value is the driving param itself, in the param's unit. */
  readonly measuresParam: boolean;
  /**
   * The solver's interval for the pointer's dim with the build's facts:
   * [lo, hi] with null for an open end, null when empty (E_UNSAT), and
   * undefined when no ConstraintDef answers for it.
   */
  readonly paramLegal?: (pointer: string) => readonly [number | null, number | null] | null | undefined;
  /** Rebuild with these values and rerun the check on the same target; undefined when the target is gone. */
  readonly predict: (values: Readonly<Record<string, unknown>>) => Promise<Prediction | undefined>;
  /** The chase target a next call names; absent, next carries no chase. */
  readonly chase?: string;
}

export interface FixOutcome {
  /** The finding, with fix and extra.predictedBuild when a fix was proven. */
  readonly finding: Finding;
  /** constraints.query when no single param resolves the finding; empty otherwise. */
  readonly next: readonly NextCall[];
}

/** The constraints.query call that answers the legal ranges of the pointers, or of the dims when no pointer is known. */
export function queryCalls(pointers: readonly string[], dims: readonly ConstraintDim[], chase?: string): NextCall[] {
  const at = chase === undefined ? {} : { chase };
  if (pointers.length > 0) {
    return [{ command: "constraints.query", args: { ...at, pointers: [...pointers] }, why: `${pointers.length} params drive this value; read their legal ranges before one edit` }];
  }
  return dims.map((dim) => ({ command: "constraints.query", args: { ...at, dim }, why: `no param declares dim ${dim}; read its legal range` }));
}

const failing = (v: Verdict): boolean => v === "fail" || v === "warn";

/** The field's range and step, the grid origin at the range minimum. */
const gridOf = (field: NumericField): { readonly lo: number; readonly hi: number; readonly step: number | undefined } =>
  ({ lo: field.range[0], hi: field.range[1], step: field.step !== undefined && field.step > 0 ? field.step : undefined });

/** Candidate values for the one pointer, in preference order, with the param's legal interval. */
function candidates(f: Finding, field: NumericField, current: number, input: FixInput, pointer: string):
  { readonly values: readonly number[]; readonly tie: boolean; readonly paramLegal: readonly [number, number] } | undefined {
  const g = gridOf(field);
  const step = g.step ?? 0;
  if (f.legal.kind === "interval") {
    const solved = input.paramLegal?.(pointer);
    const raw = solved !== undefined ? solved : input.measuresParam ? [f.legal.lo, f.legal.hi] as const : undefined;
    if (raw === undefined || raw === null) return undefined;
    const lo = Math.max(raw[0] ?? g.lo, g.lo);
    const hi = Math.min(raw[1] ?? g.hi, g.hi);
    if (lo > hi) return undefined;
    const iv = gridInterval(lo, hi, g.step, g.lo);
    if (iv === null) return undefined;
    const set = g.step === undefined ? Math.min(Math.max(current, lo), hi) : nearestInterval(lo, hi, current, step, g.lo);
    return set === null ? undefined : { values: [set], tie: false, paramLegal: [iv[0] ?? lo, iv[1] ?? hi] };
  }
  if (!input.measuresParam || typeof f.measured !== "number") return undefined;
  const range: readonly [number, number] = [g.lo, g.hi];
  const inRange = (v: number): boolean => v >= g.lo - 1e-9 && v <= g.hi + 1e-9;
  if (f.legal.kind === "multipleOf") {
    const [below, above] = nearestMultiple(f.legal.base, f.measured, f.legal.offset ?? 0);
    const dBelow = tidy(f.measured - below);
    const dAbove = tidy(above - f.measured);
    // Closer first; on a tie the larger first, so "both pass" picks it.
    const order = dBelow < dAbove ? [below, above] : [above, below];
    return { values: order.filter(inRange), tie: dBelow === dAbove, paramLegal: range };
  }
  if (f.legal.kind === "set") {
    const n = nearestSet(f.legal.values, f.measured);
    return typeof n === "number" && inRange(n) ? { values: [n], tie: false, paramLegal: range } : undefined;
  }
  return undefined;
}

/**
 * The fix for one finding, proven by a rebuild. A passing or skipped
 * finding returns unchanged with no next.
 */
export async function proposeFix(f: Finding, input: FixInput): Promise<FixOutcome> {
  const none = (): FixOutcome => ({ finding: f, next: queryCalls(input.pointers, input.dims, input.chase) });
  if (!failing(f.verdict)) return { finding: f, next: [] };
  if (input.pointers.length !== 1) return none();
  const pointer = input.pointers[0]!;
  const field = fieldAt(input.params, pointer);
  const current = valueAt(input.values, pointer);
  if (field === undefined || typeof current !== "number" || !Number.isFinite(current)) return none();
  const c = candidates(f, field, current, input, pointer);
  if (c === undefined || c.values.length === 0) return none();

  let chosen: { readonly set: number; readonly p: Prediction } | undefined;
  for (const set of c.values) {
    if (set === current) continue;
    const p = await input.predict(withValue(input.values, pointer, set));
    if (p === undefined || typeof p.finding.measured === "boolean" || Array.isArray(p.finding.measured)) continue;
    if (chosen === undefined) chosen = { set, p };
    // A tie takes the neighbour whose predicted verdict passes; the first already passing (the larger) stays.
    if (!c.tie || chosen.p.finding.verdict === "pass") break;
    if (p.finding.verdict === "pass") chosen = { set, p };
  }
  if (chosen === undefined) return none();

  const fix: Fix = {
    param: pointer, set: chosen.set, paramLegal: c.paramLegal,
    predicts: { measured: chosen.p.finding.measured as number | string, verdict: chosen.p.finding.verdict },
  };
  const extra = { ...(f.extra ?? {}), predictedBuild: chosen.p.buildHash };
  // A check measuring its own param reports the grid value it would set as nearest (D-064).
  const legal = input.measuresParam && f.legal.kind === "interval" ? { ...f.legal, nearest: chosen.set } : f.legal;
  return { finding: { ...f, legal, fix, extra } as Finding, next: [] };
}
