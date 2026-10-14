// Exporter binding cpl (M08-T14 step 3, M08-T12 step 5): the placement file
// in the dialect --dialect names, body-centre by default. Which assembler
// wants which dialect is not recorded in the evidence; the mapping is
// unconfirmed (M08 Blockers). A fabrication exporter; CHK-BRD-05 reads the
// written file back by designator.

import path from "node:path";
import { assemblyFiles } from "../board.js";
import type { BoardExporter } from "./board-exporter.js";

export const cplExporter: BoardExporter = {
  id: "cpl", version: "1.0.0", fabrication: true, processes: ["pcb"], mediaType: "text/csv", ext: "csv",
  postWrite: ["CHK-BRD-05"],
  files: (built, o) => assemblyFiles(built.record, path.basename(built.design.dir), o.dialect).filter((f) => f.exporter === "cpl")
    .map((f) => ({ name: f.name, bytes: f.bytes, kind: "cpl", mediaType: "text/csv" })),
};
