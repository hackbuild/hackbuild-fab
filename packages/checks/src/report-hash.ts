// reportHash (M04-T08 step 1, D-064, ARCHITECTURE.md 8): sha256Hex over the
// RFC 8785 form of {checks, findings} from spec/jcs.ts, the one
// canonicalizer. `checks` maps every resolved check id to its version, so a
// version bump moves the hash; skips are findings like any other, so a check
// moving from skip to run moves it too. A finding enters as id, version,
// verdict, target, measured and legal only: constraint text, origin, fix and
// extras are evidence about the finding, and timing never enters.

import { canonicalize, sha256Hex, type CheckResult, type Hash, type LegalValues } from "@hackbuild/spec";

export interface ReportHashInput {
  /** Resolved check versions, keyed by id. */
  checks: Record<string, string>;
  /** Findings sorted by id, then by the RFC 8785 string of target; no timing fields. */
  findings: { id: string; version: string; verdict: string; target: Record<string, unknown>; measured: unknown; legal: LegalValues }[];
}

/** What a report stores and parity keeps as report.json: the resolved checks, every result sorted, and its reportHash. */
export interface ReportObject {
  readonly checks: Readonly<Record<string, string>>;
  readonly findings: readonly CheckResult[];
  readonly reportHash: Hash;
}

const targetKey = (r: CheckResult): string => canonicalize(r.target);

/** The six hashed fields of a result, the form reportHash covers. */
const hashed = (r: CheckResult) => ({ id: r.id, version: r.version, verdict: r.verdict, target: r.target as unknown as Record<string, unknown>, measured: r.measured, legal: r.legal });

/**
 * Results sorted by id, then by the canonical string of target, then by the
 * canonical string of the hashed fields, a total order: a check that returns
 * several results on one target (CHK-PRT-16, one per axis) hashes the same
 * whatever order its results arrive in. Results equal on every hashed field
 * hash the same in either order.
 */
export function sortFindings(results: readonly CheckResult[]): CheckResult[] {
  const keyed = results.map((r) => ({ r, id: r.id as string, t: targetKey(r), h: canonicalize(hashed(r)) }));
  const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  keyed.sort((a, b) => cmp(a.id, b.id) || cmp(a.t, b.t) || cmp(a.h, b.h));
  return keyed.map((k) => k.r);
}

/** The hashed form: checks by id, findings sorted and cut to the six hashed fields. */
export function reportHashInput(checks: Readonly<Record<string, string>>, results: readonly CheckResult[]): ReportHashInput {
  return {
    checks: { ...checks },
    findings: sortFindings(results).map(hashed),
  };
}

/** sha256Hex(canonicalize(input)); a NaN or Infinity in a finding throws CanonicalizeError at its pointer. */
export function reportHash(input: ReportHashInput): Hash {
  return sha256Hex(canonicalize(input)) as Hash;
}

/** The report object for a run: checks, the sorted results and the hash over them. */
export function reportObject(checks: Readonly<Record<string, string>>, results: readonly CheckResult[]): ReportObject {
  return { checks: { ...checks }, findings: sortFindings(results), reportHash: reportHash(reportHashInput(checks, results)) };
}
