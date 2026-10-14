// CHK-BRD-06, inferred provenance refused at fabrication export (M08-T03
// step 6, D-102). The run is catalog's inferredGated over every catalog
// field a part of the project read (BoardRecord.reads, Part.catalogReads),
// and partGaps over the parts a board record placed, the two functions
// export.run's gate calls (provenanceGate), so the check and the gate
// cannot disagree. One fail per inferred geometry or connectivity field and
// one per placed part no gated read accounts for (an emptied reads list
// fails, never skips); fields read only by checks never appear here.

import type { Finding, Part, RecordRead, TargetOf } from "@hackbuild/spec";
import { lowestTier } from "@hackbuild/spec";
import { GATE_PASSES, gatesExport, inferredGated, partGaps } from "@hackbuild/catalog";
import { defineCheck } from "../../registry.js";
import { viewsOf, type RegistryCtx } from "../../views.js";
import { setFinding, skip } from "../common.js";

/** Every catalog read of a part: its board record's reads, then its own. */
export const readsOf = (p: Part): readonly RecordRead[] => [...(p.board?.reads ?? []), ...(p.catalogReads ?? [])];

export function runBrd06(t: TargetOf<"project">, ctx: RegistryCtx): readonly Finding[] {
  const views = viewsOf(ctx);
  const parts = t.project.items.filter((i) => i.kind === "part").map((i) => views.part?.(i.id)).filter((p): p is Part => p !== undefined);
  const reading = parts.filter((p) => readsOf(p).length > 0 || (p.board?.parts ?? []).length > 0);
  if (reading.length === 0) return [skip({ level: "project" }, "not run", "no part in this run read a catalog field or placed a catalog part")];
  return reading.flatMap((p): Finding[] => {
    const reads = readsOf(p);
    const bad = inferredGated(reads).map((r) => setFinding({ level: "part", part: p.id }, r.provenance.tier, GATE_PASSES,
      `${r.catalogId} ${r.field} is ${r.provenance.tier} (${r.provenance.source}); measure ${r.field} of ${r.catalogId} or pick a vendor row`,
      { catalogId: r.catalogId, field: r.field }));
    const gaps = partGaps(p.board?.parts ?? [], reads).map((e) => setFinding({ level: "part", part: p.id }, String(e.got), GATE_PASSES,
      `${e.path}: ${e.hint ?? ""}`, { path: e.path ?? "" }));
    if (bad.length > 0 || gaps.length > 0) return [...bad, ...gaps];
    const gated = reads.filter((r) => gatesExport(r.field));
    const lo = lowestTier(gated.map((r) => r.provenance.tier));
    if (lo === null) return [skip({ level: "part", part: p.id }, "not run", `${p.id} read only check fields (${reads.map((r) => r.field).join(", ")}); none reaches the export gate`)];
    return [setFinding({ level: "part", part: p.id }, lo, GATE_PASSES,
      `${gated.length} geometry and connectivity reads of ${p.id}, weakest ${lo}, none inferred`)];
  });
}

export const check = defineCheck({ id: "CHK-BRD-06", level: "project", run: (t, ctx) => runBrd06(t, ctx) });
