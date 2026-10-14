// CHK-BRD-09, no node without a component and no single-node net (M08-T12 step 7; the card's provisional CHK-BRD-11).
// Kernel: packages/checks/src/brd/board.ts.

import { brd09 } from "../../brd/board.js";
import { overBoards } from "../../brd/parts.js";
import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-BRD-09", level: "project", run: (t, ctx) => overBoards(t, ctx, (r, p) => brd09(r, p.id, ctx)) });
