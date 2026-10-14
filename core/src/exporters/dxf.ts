// Exporter binding dxf (M07-T14, D-138, D-109): a sheet's DXF from nest's
// one writer (packages/nest/src/dxf.ts writeDxf), a fabrication export that
// passes CHK-SHT-01, 02, 03 and 07 and then the gate.

import type { SheetExporter } from "./sheet-exporter.js";

export const dxfExporter: SheetExporter = {
  id: "dxf", version: "1.0.0", fabrication: true, processes: ["laser"], mediaType: "image/vnd.dxf", ext: "dxf",
  bytes: (s) => new TextEncoder().encode(s.dxf),
};
