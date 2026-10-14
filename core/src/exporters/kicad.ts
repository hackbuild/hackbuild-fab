// Exporter binding kicad (M08-T08, M08-T14, D-090). KiCad files are design
// files, so the exporter is not a fabrication exporter and asks no person
// (ExporterDef.fabrication false, M08 Blockers table): build, write the
// file from the record and the generator's gates.json through
// packages/board writeKicad, then read it back (CHK-BRD-22). A file that
// does not read back to the record is deleted and the export fails: a KiCad
// file leaves only after kicadts reads it back.

import path from "node:path";
import type { BoardRecord } from "@hackbuild/spec";
import { kicadExtrasOf, writeKicad, type KicadExtras } from "@hackbuild/board";
import type { BoardExporter } from "./board-exporter.js";

/** What the writer draws beyond the record: silk lines, the corner radius and the mask expansion from gates.json; silk and zones from the record. */
export function kicadExtras(record: BoardRecord, gates: Readonly<Record<string, unknown>>): KicadExtras {
  const pick = <K extends keyof KicadExtras>(k: K): Partial<Pick<KicadExtras, K>> => (gates[k] === undefined ? {} : { [k]: gates[k] } as Partial<Pick<KicadExtras, K>>);
  return { ...kicadExtrasOf(record), ...pick("silkLines"), ...pick("corner"), ...pick("maskExpansion") };
}

export const kicadExporter: BoardExporter = {
  id: "kicad", version: "1.0.0", fabrication: false, processes: ["pcb"], mediaType: "application/x-kicad-pcb", ext: "kicad_pcb",
  postWrite: ["CHK-BRD-22"],
  files: (built) => [{
    name: `${path.basename(built.design.dir)}.kicad_pcb`, kind: "kicad", mediaType: "application/x-kicad-pcb",
    bytes: new TextEncoder().encode(writeKicad(built.record, kicadExtras(built.record, built.gates))),
  }],
};
