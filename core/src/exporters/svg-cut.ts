// Exporter binding svg-cut (M07-T14, D-138, D-109): a sheet's SVG twin of
// the DXF from nest's one writer (packages/nest/src/svg.ts writeSvgCut), a
// fabrication export gated as the DXF is; CHK-SHT-03 reads the DXF the twin
// is drawn from.

import type { SheetExporter } from "./sheet-exporter.js";

export const svgCutExporter: SheetExporter = {
  id: "svg-cut", version: "1.0.0", fabrication: true, processes: ["laser"], mediaType: "image/svg+xml", ext: "svg",
  bytes: (s) => new TextEncoder().encode(s.svg),
};
