// Step marks and the bed chip, read from the build's CheckResults (CHECKS.md
// 2.7: a bench renders the report and never computes a second verdict).
//
// Step done (P-34, G-40): a step's checks are those bound to a field of its
// panels, by ParamField.checks or by a fix that writes the field's pointer;
// a check bound to no step belongs to the last step. A step is done when a
// build is on screen and none of its checks fails. Visited is its own mark
// and never implies done (TOGGLE and COLLAR marked a step done on visit).
//
// Bed chip (G-18): `fits bed` or `over bed` is CHK-PRT-16's verdict over
// every plate object on both axes, so the chip and the check cannot disagree.

import type { CheckResult, ParamField, ParamGroup, RailStep } from "@hackbuild/spec";

const PARAMS = "params.";
/** The build volume check whose results the bed chip reads. */
export const BED_CHECK = "CHK-PRT-16";

interface Scope {
  /** Pointers of plain fields, `/W`. */
  readonly exact: ReadonlySet<string>;
  /** Pointer prefixes of list fields, `/keys/`. */
  readonly prefixes: readonly string[];
  readonly checks: ReadonlySet<string>;
}

function scopeOf(step: RailStep, groups: readonly ParamGroup[]): Scope {
  const exact = new Set<string>();
  const prefixes: string[] = [];
  const checks = new Set<string>();
  const add = (f: ParamField, list: boolean, head: string): void => {
    for (const c of f.checks ?? []) checks.add(c);
    if (f.type === "list") {
      prefixes.push(`/${f.id}/`);
      for (const item of f.item) add(item, true, `/${f.id}/`);
    } else if (!list) exact.add(`${head}${f.id}`);
  };
  for (const panel of step.panels) {
    if (!panel.startsWith(PARAMS)) continue;
    const g = groups.find((x) => x.id === panel.slice(PARAMS.length));
    for (const f of g?.fields ?? []) add(f, false, "/");
  }
  return { exact, prefixes, checks };
}

function inScope(r: CheckResult, s: Scope): boolean {
  if (s.checks.has(r.id)) return true;
  const p = r.fix?.param;
  return p !== undefined && (s.exact.has(p) || s.prefixes.some((x) => p.startsWith(x)));
}

/** Index of the step each result belongs to; the last step takes the unbound. */
export function stepOfResults(steps: readonly RailStep[], groups: readonly ParamGroup[], results: readonly CheckResult[]): number[] {
  const scopes = steps.map((s) => scopeOf(s, groups));
  const last = Math.max(0, steps.length - 1);
  return results.map((r) => {
    const i = scopes.findIndex((s) => inScope(r, s));
    return i < 0 ? last : i;
  });
}

export interface StepMark {
  /** A build is on screen and no check of the step fails. */
  readonly done: boolean;
  /** The person has opened the step. */
  readonly visited: boolean;
}

export function stepMarks(
  steps: readonly RailStep[], groups: readonly ParamGroup[], results: readonly CheckResult[] | null, visited: readonly number[],
): StepMark[] {
  const owner = results === null ? [] : stepOfResults(steps, groups, results);
  return steps.map((_, i) => ({
    done: results !== null && !(results ?? []).some((r, k) => owner[k] === i && r.verdict === "fail"),
    visited: visited.includes(i),
  }));
}

/** true fits, false over, null when the build carries no build volume result. */
export function bedFits(results: readonly CheckResult[]): boolean | null {
  const bed = results.filter((r) => r.id === BED_CHECK && r.verdict !== "skip");
  if (bed.length === 0) return null;
  return bed.every((r) => r.verdict !== "fail");
}
