// The board exporters hbf registers (M08-T14 step 3). export.run reads this
// list and never switches on a kind: a board kind it does not name here is
// not a board kind. wiring registers beside them (wiring.ts), since its
// design builds a drawing and no board.

import { bomExporter } from "./bom.js";
import type { BoardExporter } from "./board-exporter.js";
import { circuitJsonExporter } from "./circuit-json.js";
import { cplExporter } from "./cpl.js";
import { gerbersExporter } from "./gerbers.js";
import { kicadExporter } from "./kicad.js";

export const BOARD_EXPORTERS: readonly BoardExporter[] = [gerbersExporter, bomExporter, cplExporter, kicadExporter, circuitJsonExporter];

export const boardExporter = (id: string): BoardExporter | undefined => BOARD_EXPORTERS.find((e) => e.id === id);

export type { BoardExporter };
