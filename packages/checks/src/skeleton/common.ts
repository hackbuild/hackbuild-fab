// Shared pieces of the M-S skeleton checks (M-S-T06, D-179): the error
// helper, number formatting for the one-line constraint, the interval
// evidence every interval check returns and the skip finding.

import type {
  CommandError, Finding, LegalValues, ThrownCommandError, Verdict,
} from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";

/** A CommandError thrown by a skeleton check (spec/errors.ts commandError). */
export const checkError: (hbf: CommandError) => ThrownCommandError = commandError;

/** The value a check needs was not declared: E_PARAM_MISSING, never a fail verdict (D-064). */
export function missing(path: string, hint: string): ThrownCommandError {
  return checkError({ code: "E_PARAM_MISSING", path, hint, record: "verification" });
}

/**
 * A number as printed in a constraint or message: at most `digits` decimals,
 * no trailing zeros. A value that is not whole keeps one decimal when it
 * rounds to a whole (10.9996 prints 11.0), because a whole print reads as
 * the exact value and has no source field to trace to (D-010).
 */
export function fmt(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return String(v);
  const s = v.toFixed(digits);
  if (!s.includes(".")) return s;
  const t = s.replace(/0+$/, "").replace(/\.$/, "");
  return t.includes(".") || Number(t) === v ? t : `${t}.0`;
}

/**
 * Float tolerance for comparisons against a legal bound, mm or the legal
 * unit: one step of the 1/1024 mm mesh grid (D-054) is far coarser, so a
 * bound computed two ways never flips a verdict.
 */
export const EPS = 1e-9;

/**
 * Interval evidence: nearest is the closest legal value to measured (D-064,
 * CHECKS.md 2.2). An open end is null (CHECKS.md 7.1).
 */
export function intervalEvidence(
  measured: number, lo: number | null, hi: number | null, unit: string,
): { readonly legal: Extract<LegalValues, { kind: "interval" }>; readonly measured: number; readonly inside: boolean } {
  const below = lo !== null && measured < lo - EPS;
  const above = hi !== null && measured > hi + EPS;
  const inside = !below && !above;
  const nearest = below ? lo : above ? hi : measured;
  return { legal: { kind: "interval", lo, hi, unit, nearest }, measured, inside };
}

/** A skip finding: legal none, the reason in constraint (CHECKS.md 2.1). */
export function skip(target: Finding["target"], measured: number | string | boolean, reason: string, extra?: Finding["extra"]): Finding {
  return { verdict: "skip", target, legal: { kind: "none" }, measured, constraint: reason, ...(extra === undefined ? {} : { extra }) };
}

export const passOr = (ok: boolean): Verdict => (ok ? "pass" : "fail");
