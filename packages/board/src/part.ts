// The record as a body-less board part (M08-T02 step 4): Part.board holds
// the record and metrics.board the counts. The counts follow the SPINDLE R1
// DRC line, pcb.py lines 225 and 287 (lineage board.metrics/spindle-r1):
// pads are every PADS entry, component pads and vias alike (55 plus 15 is
// 70), and holes are every drilled entry, plated pads and vias (42 plus 15
// is 57); non-plated mounting holes go to the NPTH file (line 451) and are
// counted apart. The tightest clearance needs the copper geometry, so the
// backend passes it: the direct route's DRC computes it (pcb.py lines 285
// to 286, M08-T06) and writes it to gates.json.

import { qualify, type BoardBackend, type BoardRecord, type Metric } from "@hackbuild/spec";

/** BuildInputs.adapter for a board build: "board/direct-1" or "board/tscircuit-<version>". */
export function boardAdapter(backend: BoardBackend, tscircuitVersion?: string): string {
  if (backend === "direct") return "board/direct-1";
  if (tscircuitVersion === undefined || tscircuitVersion === "") throw new Error("board/tscircuit adapter needs the installed tscircuit version");
  return `board/tscircuit-${tscircuitVersion}`;
}

/**
 * Counts read straight off the record, so qualify([]): computed, basis null.
 * tightest is the least top-copper distance between two nets, mm, as the
 * backend's DRC computed it; it joins the counts when given.
 */
export function boardMetrics(record: BoardRecord, tightest?: { readonly mm: number; readonly rule: number }): Metric[] {
  const drilledPads = record.pads.filter((p) => p.drill !== undefined).length;
  const count = (id: string, value: number, note: string): Metric => ({
    id: `board.${id}`, value, unit: "count", note, gate: "informational", group: "board", ...qualify([]),
  });
  return [
    count("nets", record.nets.length, `${record.nets.length} named nets`),
    count("pads", record.pads.length + record.vias.length, `${record.pads.length} component pads plus ${record.vias.length} vias`),
    count("holes", drilledPads + record.vias.length, `${drilledPads} drilled pads plus ${record.vias.length} vias, plated`),
    count("vias", record.vias.length, `${record.vias.length} vias`),
    count("npth", record.holes.length, `${record.holes.length} non-plated holes`),
    ...(tightest === undefined ? [] : [{
      id: "board.tightest", value: tightest.mm, unit: "mm", gate: "informational" as const, group: "board", ...qualify([]),
      note: `tightest ${tightest.mm.toFixed(2)} mm top copper between two nets, rule ${tightest.rule} mm`,
    }]),
  ];
}
