// CHK-BRD-07, its outline clause (M08-T12 step 1): every pad, via and track vertex inside the outline. The unrouted and routed-width clauses wait on the route the backend reports (M08-T06, M08-T10) and are not judged here.
// Kernel: packages/checks/src/brd/board.ts.

import { brd07Outline } from "../../brd/board.js";
import { overBoards } from "../../brd/parts.js";
import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-BRD-07", level: "project", run: (t, ctx) => overBoards(t, ctx, (r) => [brd07Outline(r)]) });
