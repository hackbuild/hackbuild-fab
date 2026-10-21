// Claim evidence rows (R1-engine-26, plan v9 section 3.1: slicer saves,
// caliper numbers, photos and notes attach to a claim through hbf evidence
// add). One row per line of designs/<id>/evidence/evidence.jsonl, appended
// by core and never rewritten. CHK-CLAIM-01 reads the rows: the last
// measured value of a claim, converted to the claim's unit, replaces the
// computed one and passes or fails as measured; a note with a direction
// moves an in-band claim to warn and never sets a number. Files and notes
// without a direction are listed and move no verdict.

import { commandError, type ClaimDecl, type EvidenceRef } from "@hackbuild/spec";

export const EVIDENCE_KINDS = ["caliper", "slicer-save", "photo", "note", "coupon"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_DIRECTIONS = ["high", "low"] as const;
export type EvidenceDirection = (typeof EVIDENCE_DIRECTIONS)[number];

/** One evidence row as evidence.jsonl stores it. */
export interface EvidenceRow {
  /** sha256 of the row without id, first 12 hex. */
  readonly id: string;
  /** ClaimDecl.id of the design's chase. */
  readonly claim: string;
  readonly kind: EvidenceKind;
  /** A reading, in `unit`; present only with unit. */
  readonly value?: number;
  readonly unit?: string;
  /** measured for a row with a value, none for every other. */
  readonly qualifier: "measured" | "none";
  readonly note?: string;
  /** The way the part misses the claim, by a person's feel; only with a note. */
  readonly direction?: EvidenceDirection;
  /** A stored file: its sha256 and its path under the design directory. */
  readonly file?: { readonly sha256: string; readonly path: string };
  /** ISO 8601 time of the add. */
  readonly at: string;
  /** person when the add ran at a terminal, agent otherwise. */
  readonly who: "person" | "agent";
}

/** Standard gravity, m/s2, exact by definition (CGPM 1901); grams-force to newtons. */
export const STANDARD_GRAVITY = 9.80665;

/** Units a reading may carry: the dimension and the factor to its base, N for force and mm for length. */
export const EVIDENCE_UNITS: Readonly<Record<string, { readonly dim: "force" | "length"; readonly toBase: number }>> = {
  N: { dim: "force", toBase: 1 },
  mN: { dim: "force", toBase: 1e-3 },
  g: { dim: "force", toBase: STANDARD_GRAVITY / 1000 },
  kg: { dim: "force", toBase: STANDARD_GRAVITY },
  mm: { dim: "length", toBase: 1 },
  um: { dim: "length", toBase: 1e-3 },
  cm: { dim: "length", toBase: 10 },
  in: { dim: "length", toBase: 25.4 },
};

/** value in `from` expressed in `to`; an unknown unit or a dimension mismatch is E_SCHEMA. */
export function convertUnit(value: number, from: string, to: string, path = "/unit"): number {
  if (from === to) return value;
  const a = EVIDENCE_UNITS[from], b = EVIDENCE_UNITS[to];
  const units = Object.keys(EVIDENCE_UNITS).join(", ");
  if (a === undefined || b === undefined) {
    throw commandError({ code: "E_SCHEMA", path, got: a === undefined ? from : to, expected: units, hint: `no conversion from ${from} to ${to}; give the reading in ${to}`, record: "claim-evidence/unit" });
  }
  if (a.dim !== b.dim) {
    throw commandError({ code: "E_SCHEMA", path, got: from, expected: `a ${b.dim} unit`, hint: `a ${a.dim} reading cannot back a claim in ${to}`, record: "claim-evidence/unit" });
  }
  return (value * a.toBase) / b.toBase;
}

const SHA256 = /^[0-9a-f]{64}$/;

function rowProblem(v: Record<string, unknown>): string | null {
  if (typeof v["id"] !== "string" || typeof v["claim"] !== "string" || v["claim"] === "") return "id and claim are strings";
  if (!(EVIDENCE_KINDS as readonly unknown[]).includes(v["kind"])) return `kind is one of ${EVIDENCE_KINDS.join(", ")}`;
  if ((v["value"] === undefined) !== (v["unit"] === undefined)) return "value and unit come together";
  if (v["value"] !== undefined && (typeof v["value"] !== "number" || !Number.isFinite(v["value"]))) return "value is a finite number";
  if (v["qualifier"] !== (v["value"] === undefined ? "none" : "measured")) return "qualifier is measured with a value and none without";
  if (v["direction"] !== undefined && (typeof v["note"] !== "string" || !(EVIDENCE_DIRECTIONS as readonly unknown[]).includes(v["direction"]))) return "direction is high or low and comes with a note";
  const f = v["file"] as { sha256?: unknown; path?: unknown } | undefined;
  if (f !== undefined && (typeof f.sha256 !== "string" || !SHA256.test(f.sha256) || typeof f.path !== "string")) return "file holds a sha256 and a path";
  if (typeof v["at"] !== "string" || (v["who"] !== "person" && v["who"] !== "agent")) return "at is a time and who is person or agent";
  return null;
}

/** The rows of an evidence.jsonl text; a malformed line is E_SCHEMA naming it. */
export function parseEvidence(text: string, file = "evidence.jsonl"): EvidenceRow[] {
  return text.split("\n").flatMap((line, i): EvidenceRow[] => {
    if (line.trim() === "") return [];
    let v: unknown;
    try {
      v = JSON.parse(line);
    } catch {
      v = null;
    }
    const problem = v !== null && typeof v === "object" ? rowProblem(v as Record<string, unknown>) : "the line is a json object";
    if (problem !== null) {
      throw commandError({ code: "E_SCHEMA", path: `/evidence/${i}`, got: line.slice(0, 80), expected: problem, hint: `${file}:${i + 1} is not an evidence row; restore it from git`, record: "claim-evidence/row" });
    }
    return [v as EvidenceRow];
  });
}

/** The last measured reading of a claim in its want.unit, or null. */
export function measuredOf(rows: readonly EvidenceRow[], decl: ClaimDecl): { readonly row: EvidenceRow; readonly value: number } | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]!;
    if (r.claim !== decl.id || r.qualifier !== "measured" || r.value === undefined || r.unit === undefined) continue;
    return { row: r, value: convertUnit(r.value, r.unit, decl.want.unit, `/evidence/${r.id}/unit`) };
  }
  return null;
}

/** The last note of a claim that carries a direction, or null. */
export function directionOf(rows: readonly EvidenceRow[], claim: string): EvidenceRow | null {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i]!.claim === claim && rows[i]!.direction !== undefined) return rows[i]!;
  return null;
}

/** A row as a ClaimResult evidence entry: the stored file, or the row id. */
export function evidenceRef(r: EvidenceRow): EvidenceRef {
  return r.file === undefined ? { kind: "record", ref: `evidence:${r.id}` } : { kind: "file", ref: r.file.path };
}

/** Every measured reading of a claim in its want.unit, in file order: what plot.curve draws as measured points (WidgetBuild.readings). */
export function measuredValues(rows: readonly EvidenceRow[], decl: ClaimDecl): number[] {
  return rows.flatMap((r) => (r.claim === decl.id && r.qualifier === "measured" && r.value !== undefined && r.unit !== undefined
    ? [convertUnit(r.value, r.unit, decl.want.unit, `/evidence/${r.id}/unit`)] : []));
}
