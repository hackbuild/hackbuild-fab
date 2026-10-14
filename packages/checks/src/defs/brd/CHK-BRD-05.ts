// CHK-BRD-05: BOM, CPL and netlist cross-checked by designator (M08-T12
// step 4). The run body is packages/checks/src/brd/assembly.ts.

import { runBrd05 } from "../../brd/assembly.js";
import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-BRD-05", level: "artifact", run: (t) => runBrd05(t) });
