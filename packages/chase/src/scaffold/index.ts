// chase.scaffold over text (M10-T05 step 1): the minimal scaffold per kind,
// the edits that turn a copied chase into a new design, and the default
// that lands inside a solver interval (generate from legal,
// api-library-ai-design.md 8.4). Pure: core reads the sources, solves the
// intervals and writes the files.

import type { ChaseKind, PatchEdit, ParamField } from "@hackbuild/spec";
import { isNumeric, onStep } from "../schema.js";
import { composerScaffold } from "./composer.js";
import { singleScaffold, type MinimalKind, type ScaffoldFiles } from "./single.js";

export { benchSource, displayName, minimalScaffold, singleScaffold, type BenchGroup, type MinimalKind, type ScaffoldFiles } from "./single.js";
export { composerScaffold } from "./composer.js";

/** The minimal scaffold per kind; a kind absent here scaffolds only from a reference or design. */
export const SCAFFOLDS: Readonly<Record<MinimalKind, (name: string) => ScaffoldFiles>> = {
  single: singleScaffold,
  composer: composerScaffold,
};

export const hasScaffold = (kind: ChaseKind): kind is MinimalKind => Object.prototype.hasOwnProperty.call(SCAFFOLDS, kind);

/**
 * The edits that make a copied chase.ts the design `name`: meta.id set to
 * the name and meta.derivedFrom set (added when absent; the caller passes
 * addMembers) when the source has a golden build hash.
 */
export function copyEdits(name: string, derivedFrom: { readonly id: string; readonly buildHash: string } | undefined): PatchEdit[] {
  return [
    { pointer: "/meta/id", set: name },
    ...(derivedFrom === undefined ? [] : [{ pointer: "/meta/derivedFrom", set: { id: derivedFrom.id, buildHash: derivedFrom.buildHash } }]),
  ];
}

/** The path comment a copied file opens with, rewritten to its new path; other text is kept byte for byte. */
export function retarget(text: string, from: string, to: string): string {
  const first = `// ${from}`;
  return text.startsWith(`${first}\n`) ? `// ${to}${text.slice(first.length)}` : text;
}

const STEP_DIGITS = 9;
const tidy = (v: number): number => Number(v.toFixed(STEP_DIGITS));

/** The unit a numeric field's value is in, as an Interval names it. */
export function fieldUnit(f: ParamField): string | undefined {
  if (!isNumeric(f)) return undefined;
  if (f.type === "number") return f.unit;
  return f.type === "int" ? undefined : f.type;
}

/**
 * The default to write for a numeric field so it lies inside both its
 * range and the solver's legal interval, on its step from the range
 * minimum: the field's own default when it already does, else the on-step
 * value nearest to it. undefined when the default stands (no interval, a
 * unit the interval does not share) or no on-step value is legal.
 */
export function legalDefault(f: ParamField, legal: readonly [number | null, number | null] | null, unit: string): number | undefined {
  if (!isNumeric(f) || legal === null || typeof f.default !== "number" || fieldUnit(f) !== unit) return undefined;
  const lo = Math.max(f.range[0], legal[0] ?? -Infinity);
  const hi = Math.min(f.range[1], legal[1] ?? Infinity);
  const d = f.default;
  if (lo > hi) return undefined;
  if (d >= lo && d <= hi) return undefined;
  const target = Math.min(hi, Math.max(lo, d));
  const step = f.step;
  if (step === undefined) return tidy(target);
  const r0 = f.range[0];
  // Step indexes of the first and last legal values; a bound on the grid is legal itself.
  const kLo = onStep(lo, r0, step) ? Math.round((lo - r0) / step) : Math.ceil((lo - r0) / step);
  const kHi = onStep(hi, r0, step) ? Math.round((hi - r0) / step) : Math.floor((hi - r0) / step);
  if (kLo > kHi) return undefined;
  return tidy(r0 + Math.min(kHi, Math.max(kLo, Math.round((target - r0) / step))) * step);
}
