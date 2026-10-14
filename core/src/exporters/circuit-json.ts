// Exporter binding circuit-json (M08-T14 step 3, D-091): registered so the
// kind is known and its fabrication flag is stated (false, M08 Blockers),
// with no writer yet. The writer is M08-T11, which waits on the owner's
// Node 24 decision for the tscircuit family; export.run names that card.

import type { BoardExporter } from "./board-exporter.js";

export const circuitJsonExporter: BoardExporter = {
  id: "circuit-json", version: "0.0.0", fabrication: false, processes: ["pcb"], mediaType: "application/json", ext: "json",
  postWrite: [], pending: "M08-T11",
};
