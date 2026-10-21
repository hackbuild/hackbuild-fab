// The claim check, CHK-CLAIM-01 (R1-engine-11): each claim's function on
// the build's metrics, held to the chase's band lo <= value <= hi
// (spec/claims.ts, absolute bounds, no tolerance). The value is computed;
// its basis is the lowest tier among the metrics the function reads. A
// value on an inferred basis with no evidence attached claims no proof
// (owner rule: no number claims proof without a coupon), so a value inside
// its band reads warn and inferred until evidence backs it. A value outside
// its band fails whatever its basis. Evidence rows (evidence.ts,
// R1-engine-26) come after: a measured reading replaces the computed value
// and passes or fails as measured; a note with a direction turns an
// in-band claim to warn and sets no number.

import { commandError, qualify } from "@hackbuild/spec";
import type { ClaimDecl, ClaimResult, EvidenceRef, Finding, Metric, Qualification, ResultTarget, Tier } from "@hackbuild/spec";
import { claimFn, metricId, type ClaimCtx, type RegisteredClaimFn } from "./registry.js";
import { fmt } from "../skeleton/common.js";
import { directionOf, evidenceRef, measuredOf, type EvidenceRow } from "./evidence.js";
import "./fns.js";

/** Everything a claim run reads besides the declarations. */
export interface ClaimRun extends ClaimCtx {
  /** Evidence attached to each claim, by ClaimDecl.id. */
  readonly evidence?: Readonly<Record<string, readonly EvidenceRef[]>>;
  /** The design's evidence rows, every claim's, in file order (designs/<id>/evidence/evidence.jsonl). */
  readonly rows?: readonly EvidenceRow[];
}

/** True when lo <= value <= hi. */
export function inBand(value: number, want: ClaimDecl["want"]): boolean {
  return value >= want.lo && value <= want.hi;
}

function readsOf(def: RegisteredClaimFn, decl: ClaimDecl, metrics: readonly Metric[]): readonly Metric[] {
  if (def.reads === undefined) return metrics;
  const args = decl.args ?? {};
  const ids = def.reads.map((r) => metricId(args, r));
  return metrics.filter((m) => ids.some((id) => (id.endsWith(".") ? m.id.startsWith(id) : m.id === id)));
}

/** Qualification over the metrics read: computed on their lowest tier, unknown when one is unknown. */
export function claimQualification(read: readonly Metric[]): Qualification {
  const tiers: (Tier | null)[] = read.flatMap((m): (Tier | null)[] => (m.qualifier === "unknown" ? [null] : m.basis === null ? [] : [m.basis]));
  return qualify(tiers);
}

function checkArgs(def: RegisteredClaimFn, decl: ClaimDecl, at: string): void {
  const args = decl.args ?? {};
  for (const [k, v] of Object.entries(args)) {
    const spec = def.inputs[k];
    if (spec === undefined || typeof v !== spec.type) {
      throw commandError({
        code: "E_SCHEMA", path: `${at}/args/${k}`, got: String(v), expected: spec === undefined ? Object.keys(def.inputs).join(", ") : `a ${spec.type}`,
        hint: `${def.id} takes ${Object.keys(def.inputs).join(", ")}`, record: "chase-claim/args",
      });
    }
  }
  if (decl.want.unit !== def.unit) {
    throw commandError({ code: "E_SCHEMA", path: `${at}/want/unit`, got: decl.want.unit, expected: def.unit, hint: `${def.id} returns ${def.unit}; state the band in ${def.unit}`, record: "chase-claim/unit" });
  }
}

/** One claim on one build. */
export function checkClaim(decl: ClaimDecl, metrics: readonly Metric[], run: ClaimRun = {}, at = "/claims/0"): ClaimResult {
  const def = claimFn(decl.fn);
  checkArgs(def, decl, at);
  const computed = def.fn(metrics, decl.args ?? {}, run);
  const proof = run.evidence?.[decl.id] ?? [];
  const rows = (run.rows ?? []).filter((r) => r.claim === decl.id);
  const evidence = [...proof, ...rows.map(evidenceRef)];
  const m = measuredOf(rows, decl);
  if (m !== null) {
    return { id: decl.id, value: m.value, qualification: { qualifier: "measured", basis: "measured" }, verdict: inBand(m.value, decl.want) ? "pass" : "fail", evidence };
  }
  const q = claimQualification(readsOf(def, decl, metrics));
  const unproven = q.qualifier === "computed" && q.basis === "inferred" && proof.length === 0;
  const qualification: Qualification = unproven ? { qualifier: "inferred", basis: "inferred" } : q;
  const felt = directionOf(rows, decl.id) !== null;
  const verdict = !inBand(computed, decl.want) ? "fail" : unproven || felt ? "warn" : "pass";
  return { id: decl.id, value: computed, qualification, verdict, evidence };
}

/** Every claim of a chase on one build, in declaration order. */
export function checkClaims(claims: readonly ClaimDecl[], metrics: readonly Metric[], run: ClaimRun = {}): readonly ClaimResult[] {
  return claims.map((c, i) => checkClaim(c, metrics, run, `/claims/${i}`));
}

/** The CHK-CLAIM-01 finding of one claim result; rows are the run's evidence rows, for the note a warn names. */
export function claimFinding(target: ResultTarget, decl: ClaimDecl, r: ClaimResult, rows: readonly EvidenceRow[] = []): Finding {
  const { lo, hi, unit } = decl.want;
  const nearest = r.value < lo ? lo : r.value > hi ? hi : r.value;
  const { qualifier, basis } = r.qualification;
  const q = `${qualifier}${basis === null ? "" : `, ${basis} basis`}`;
  const note = qualifier === "measured" ? null : directionOf(rows.filter((x) => x.claim === decl.id), decl.id);
  const why = r.verdict === "fail"
    ? `claim ${decl.id} ${decl.fn} ${fmt(r.value)} ${unit} (${q}), legal ${fmt(lo)} to ${fmt(hi)}, set by ${decl.why}`
    : note !== null
      ? `claim ${decl.id} ${decl.fn} reads ${note.direction} by the ${note.who}'s note "${note.note ?? ""}", no measured value; measure it and add it with hbf evidence add`
      : r.verdict === "warn"
        ? `claim ${decl.id} ${decl.fn} ${fmt(r.value)} ${unit} in band on an inferred basis with no evidence; attach a coupon result to prove it`
        : `claim ${decl.id} ${decl.fn} in band (${q}), set by ${decl.why}`;
  return {
    verdict: r.verdict, target, measured: r.value,
    legal: { kind: "interval", lo, hi, unit, nearest },
    constraint: why,
    extra: {
      claim: decl.id, fn: decl.fn, nominal: decl.want.nominal, qualifier, basis: basis ?? "none", evidence: r.evidence.length,
      ...(note === null ? {} : { direction: note.direction!, note: note.id }),
    },
  };
}
