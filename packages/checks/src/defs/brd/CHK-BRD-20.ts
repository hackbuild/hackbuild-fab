// CHK-BRD-20, solder jumpers at their declared default join no two fed
// supply nets (M08-T12 step 6, D-088; the card's provisional CHK-BRD-10,
// which CHECKS.md gives to duplicate supplier codes). Kernel:
// packages/checks/src/brd/board.ts brd20.

import { brd20 } from "../../brd/board.js";
import { overBoards } from "../../brd/parts.js";
import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-BRD-20", level: "project", run: (t, ctx) => overBoards(t, ctx, (r, _p, catalog) => brd20(r, catalog)) });
