// The sheet exporters hbf registers (M07-T14 step 3). export.run reads this
// list and never switches on a kind: a kind it does not name here or as 3mf
// is E_REF.

import { dxfExporter } from "./dxf.js";
import type { SheetExporter } from "./sheet-exporter.js";
import { svgCutExporter } from "./svg-cut.js";

export const SHEET_EXPORTERS: readonly SheetExporter[] = [dxfExporter, svgCutExporter];

export type { SheetExporter };
