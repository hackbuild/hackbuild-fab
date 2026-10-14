// CHK-BRD-21: one island per net across layers, and no copper joining two
// nets unless declared a bridge (M08-T12 step 7; the card's provisional
// CHK-BRD-12, which CHECKS.md gives to the regulator feedback divider).
// Kernel: packages/checks/src/brd/islands.ts on packages/board connect.ts.

import { brd21 } from "../../brd/islands.js";
import { overBoards } from "../../brd/parts.js";
import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-BRD-21", level: "project", run: (t, ctx) => overBoards(t, ctx, (r, p) => brd21(r, p.id, ctx)) });
