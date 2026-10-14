// CHK-BRD-22: a KiCad board reads back to the record by kicadts (M08-T08
// step 2; the card's provisional CHK-BRD-09, which CHECKS.md gives to
// nodes without a component). The run body is
// packages/checks/src/brd/chk-brd-22.ts.

import { defineCheck } from "../../registry.js";
import { runBrd22 } from "../../brd/chk-brd-22.js";

export const check = defineCheck({ id: "CHK-BRD-22", level: "artifact", run: (t) => runBrd22(t) });
