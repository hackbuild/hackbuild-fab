// CHK-BRD-08, netlist pin completeness on two-terminal parts (M08-T12 step 7; the card's provisional CHK-BRD-11).
// Kernel: packages/checks/src/brd/board.ts.

import { brd08 } from "../../brd/board.js";
import { overBoards } from "../../brd/parts.js";
import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-BRD-08", level: "project", run: (t, ctx) => overBoards(t, ctx, (r) => brd08(r)) });
