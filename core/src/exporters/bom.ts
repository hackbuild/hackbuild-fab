// Exporter binding bom (M08-T14 step 3): the BOM packages/board writes from
// the record (M08-T12 step 4). A fabrication exporter; CHK-BRD-05 reads the
// written file back by designator.

import path from "node:path";
import { assemblyFiles } from "../board.js";
import type { BoardExporter } from "./board-exporter.js";

export const bomExporter: BoardExporter = {
  id: "bom", version: "1.0.0", fabrication: true, processes: ["pcb"], mediaType: "text/csv", ext: "csv",
  postWrite: ["CHK-BRD-05"],
  files: (built) => assemblyFiles(built.record, path.basename(built.design.dir)).filter((f) => f.exporter === "bom")
    .map((f) => ({ name: f.name, bytes: f.bytes, kind: "bom", mediaType: "text/csv" })),
};
