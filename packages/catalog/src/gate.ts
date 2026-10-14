// The provenance gate (D-102, M08-T03 steps 4 to 6). A fabrication export
// whose build read an inferred catalog field on a geometry or connectivity
// path stops with E_PROVENANCE, exit 4, one CommandError per field. Fields
// read only by checks never trigger it. CHK-BRD-06 runs the same
// inferredGated list inside check.run, so the gate and the check cannot
// disagree. Profile rows keep their own rule (inferred warns, never refuses).
//
// The reads list is written by the generator about itself, so the gate also
// holds it against the record's parts: a placed part with no geometry or
// connectivity read of its catalog id, or one whose declared tier is
// inferred while its reads say otherwise, refuses too (partGaps).

import type { CommandError, ExporterDef, RecordPart, RecordRead } from "@hackbuild/spec";
import { lowestTier } from "@hackbuild/spec";
import { fieldUse, gatesExport } from "./fields.js";

/** The tiers a gated field may carry at fabrication export. */
export const GATE_PASSES = ["verified", "measured", "vendor", "community"] as const;

/** Check id that records the gate (seed row CHK-BRD-06). */
export const GATE_RECORD = "CHK-BRD-06";

/** Inferred reads on a geometry or connectivity field, one per catalog id and field, in first-read order. */
export function inferredGated(reads: readonly RecordRead[]): readonly RecordRead[] {
  const seen = new Set<string>();
  const out: RecordRead[] = [];
  for (const r of reads) {
    if (r.provenance.tier !== "inferred" || !gatesExport(r.field)) continue;
    const key = `${r.catalogId}\u0000${r.field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** The E_PROVENANCE error for one inferred read. */
export function provenanceErrorOf(r: RecordRead): CommandError {
  return {
    code: "E_PROVENANCE",
    path: `/catalog/${r.catalogId}/${r.field}`,
    got: r.provenance.tier,
    expected: "verified, measured, vendor or community",
    hint: `measure ${r.field} of ${r.catalogId} or pick a vendor row; catalog.find ${r.catalogId} --tier vendor`,
    record: GATE_RECORD,
  };
}

/** The part fields the gate holds against the reads. */
export type GatedPart = Pick<RecordPart, "ref" | "catalogId" | "tier">;

/** True when read r is about part p: the same catalog id, and a field that is p's own (`<ref>.<field>`) or a plain catalog field name. */
export function readsPart(r: RecordRead, p: GatedPart): boolean {
  return r.catalogId === p.catalogId && (r.field.startsWith(`${p.ref}.`) || fieldUse(r.field) !== undefined);
}

/**
 * One E_PROVENANCE per placed part the reads do not account for: no gated
 * read of its catalog id at all, or a declared tier of inferred while every
 * gated read of it is stronger. A part already caught by inferredGated gets
 * no second error.
 */
export function partGaps(parts: readonly GatedPart[], reads: readonly RecordRead[]): readonly CommandError[] {
  const out: CommandError[] = [];
  for (const p of parts) {
    const own = reads.filter((r) => readsPart(r, p) && gatesExport(r.field));
    if (own.length === 0) {
      out.push({
        code: "E_PROVENANCE",
        path: `/parts/${p.ref}`,
        got: "no catalog read",
        expected: `a geometry or connectivity read of ${p.catalogId}`,
        hint: `${p.ref} is placed from ${p.catalogId} but the record lists no read of its pads or body; the generator must record what it read`,
        record: GATE_RECORD,
      });
      continue;
    }
    if (p.tier === "inferred" && !own.some((r) => r.provenance.tier === "inferred")) {
      const lo = lowestTier(own.map((r) => r.provenance.tier));
      out.push({
        code: "E_PROVENANCE",
        path: `/parts/${p.ref}/tier`,
        got: "inferred",
        expected: "verified, measured, vendor or community",
        hint: `${p.ref} declares tier inferred while its reads of ${p.catalogId} say ${lo ?? "none"}; measure ${p.catalogId} or pick a vendor row`,
        record: GATE_RECORD,
      });
    }
  }
  return out;
}

/** What the gate reads: a bare reads list, or a board record whose parts are held against its reads. */
export type GateSource = readonly RecordRead[] | { readonly reads: readonly RecordRead[]; readonly parts: readonly GatedPart[] };

export type GateResult = { readonly ok: true } | { readonly ok: false; readonly errors: readonly CommandError[] };

/**
 * Refuse a fabrication exporter when any gated field read is inferred, or,
 * given a record, when a placed part has no gated read or declares inferred
 * (partGaps); any other exporter passes.
 */
export function provenanceGate(source: GateSource, exporter: Pick<ExporterDef, "id" | "fabrication">): GateResult {
  if (!exporter.fabrication) return { ok: true };
  const reads = "reads" in source ? source.reads : source;
  const parts = "reads" in source ? source.parts : [];
  const errors = [...inferredGated(reads).map(provenanceErrorOf), ...partGaps(parts, reads)];
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
