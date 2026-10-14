// Severity and precondition checks (M04-T03, D-067, CHECKS.md section 3).
// Severity says what a fail of a check stops; verdict says what happened on
// one target. No severity stops the build: the Part IR is stored before any
// check runs. A block fail stops fabrication export and exits 1; a warn or
// note fail is shown as verdict warn and exits 0. The text mirror labels
// them FAIL, WARN and NOTE, in that order.
//
// Precondition checks prove the solid, its topology and its volumes. When
// one fails on a part, every check that reads that part's solid returns skip
// "precondition <id> failed" instead of a verdict computed on a wrong solid;
// every other check still runs. A check reads the solid when it needs the
// mesh kernel (D-057), the kernel that owns volume, topology and per-body
// meshes (knowledge/kernels/mesh-kernel.md). Precondition checks run in
// seed order, so a precondition is skipped only by one seeded before it.

import { SEVERITY_EFFECT, type CheckId, type CheckLevel, type CheckResult, type CheckTarget, type KernelId, type ResultTarget, type Severity } from "@hackbuild/spec";

/** The text mirror word of a finding by severity, in print order (CHECKS.md section 3). */
export const SEVERITY_LABEL = { block: "FAIL", warn: "WARN", note: "NOTE" } as const satisfies Record<Severity, string>;

export type SeverityLabel = (typeof SEVERITY_LABEL)[Severity];

/**
 * A result as its severity reports it. A fail of a check whose severity does
 * not block export is shown as verdict warn (D-067); every other result is
 * returned unchanged. measured, legal and fix stay as the run computed them.
 */
export function withSeverity(r: CheckResult): CheckResult {
  if (r.verdict !== "fail" || SEVERITY_EFFECT[r.severity] === "block-export") return r;
  return { ...r, verdict: "warn" };
}

/** True when the result stops fabrication export: a fail of a block check. */
export const blocksExport = (r: CheckResult): boolean => r.verdict === "fail" && SEVERITY_EFFECT[r.severity] === "block-export";

/** The word a finding prints under, or null for a pass or skip, which are counted only. */
export function findingLabel(r: CheckResult): SeverityLabel | null {
  if (r.verdict === "fail") return SEVERITY_LABEL.block;
  if (r.verdict !== "warn") return null;
  return r.severity === "note" ? SEVERITY_LABEL.note : SEVERITY_LABEL.warn;
}

const LABEL_RANK: Readonly<Record<SeverityLabel, number>> = { FAIL: 0, WARN: 1, NOTE: 2 };

/** Findings in print order, FAIL then WARN then NOTE, stable within a label; passes and skips are dropped. */
export function bySeverity(results: readonly CheckResult[]): CheckResult[] {
  return results
    .map((r, i) => ({ r, i, l: findingLabel(r) }))
    .filter((x): x is { r: CheckResult; i: number; l: SeverityLabel } => x.l !== null)
    .sort((a, b) => LABEL_RANK[a.l] - LABEL_RANK[b.l] || a.i - b.i)
    .map((x) => x.r);
}

/** The kernel whose output a precondition check proves (D-057). */
export const SOLID_KERNEL: KernelId = "mesh";

/** Levels whose target is a part or lies on one; a sheet, net, artifact, source, page or project check reads no part solid. */
const SOLID_LEVELS: ReadonlySet<CheckLevel> = new Set<CheckLevel>(["part", "body", "feature", "assembly"]);

/** The CheckDef fields the precondition rule reads. */
export interface GateFields {
  readonly id: CheckId;
  readonly needs: readonly KernelId[];
  readonly appliesTo: { readonly level: CheckLevel };
  readonly precondition?: true;
}

/** True when the check reads a part's volume, topology or per-body geometry. */
export const readsSolid = (def: GateFields): boolean => def.needs.includes(SOLID_KERNEL) && SOLID_LEVELS.has(def.appliesTo.level);

/** The skip reason a gated check reports, exactly as CHECKS.md section 3 words it. */
export const preconditionReason = (id: CheckId | string): string => `precondition ${id} failed`;

/** The precondition checks of a def list, in their seed order. */
export const preconditionIds = (defs: readonly GateFields[]): CheckId[] => defs.filter((d) => d.precondition === true).map((d) => d.id);

/**
 * Def indices in run order: precondition checks first, then the rest, each
 * group in seed order. A runner fills results by index, so reports keep
 * seed order however the checks ran.
 */
export function runOrder(defs: readonly GateFields[]): number[] {
  const idx = defs.map((_, i) => i);
  return [...idx.filter((i) => defs[i]!.precondition === true), ...idx.filter((i) => defs[i]!.precondition !== true)];
}

/**
 * The failed precondition that gates `def`, from the precondition ids failed
 * on its target's parts in seed order, or null when the check runs. A check
 * that does not read the solid is never gated; a precondition check is
 * gated only by one seeded before it, so the rule has no cycle.
 */
export function gatedBy(def: GateFields, failed: readonly CheckId[], order: readonly CheckId[]): CheckId | null {
  if (!readsSolid(def) || failed.length === 0) return null;
  const at = order.indexOf(def.id);
  const hit = failed.find((f) => f !== def.id && (def.precondition !== true || (at >= 0 && order.indexOf(f) < at)));
  return hit ?? null;
}

/** Part ids a check target lies on; an assembly lies on each of its parts. */
export function partsOfTarget(t: CheckTarget): string[] {
  switch (t.level) {
    case "part":
    case "body":
    case "feature":
    case "net":
      return [t.part.id];
    case "assembly":
      return t.assembly.parts.map((p) => p.id);
    case "sheet":
      return t.parts.map((p) => p.id);
    default:
      return [];
  }
}

/** Part ids a result names; a pair names the parts of both members. */
export function partsOfResult(t: ResultTarget): string[] {
  if (t.level === "pair") return [...partsOfResult(t.a), ...partsOfResult(t.b)];
  const part = (t as { readonly part?: unknown }).part;
  return typeof part === "string" ? [part] : [];
}

/**
 * Failed precondition ids by part id, in seed order, from results already
 * stamped. Only a fail counts: a precondition check is block, so its fail is
 * never softened to warn, and a skip proves nothing either way.
 */
export function failedPreconditions(results: readonly CheckResult[], order: readonly CheckId[]): ReadonlyMap<string, readonly CheckId[]> {
  const out = new Map<string, CheckId[]>();
  for (const r of results) {
    if (r.verdict !== "fail" || !order.includes(r.id)) continue;
    for (const part of partsOfResult(r.target)) {
      const list = out.get(part) ?? [];
      if (!list.includes(r.id)) list.push(r.id);
      out.set(part, list);
    }
  }
  for (const list of out.values()) list.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return out;
}

/** Precondition ids failed on any of the parts, in seed order. */
export function failedOn(failed: ReadonlyMap<string, readonly CheckId[]>, parts: readonly string[], order: readonly CheckId[]): CheckId[] {
  const ids = new Set(parts.flatMap((p) => failed.get(p) ?? []));
  return order.filter((id) => ids.has(id));
}
