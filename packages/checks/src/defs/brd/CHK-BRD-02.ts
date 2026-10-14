// CHK-BRD-02: drill inside its own pad with margin, and every hole of a
// catalog module on its catalog pin (M08-T12 step 2). The target is a pad
// feature of the board part (core emits one per drilled record pad); the
// kernel is packages/checks/src/brd/board.ts brd02Pad, its limits the
// profile constants pcb.drillMargin and pcb.moduleLanding.

import { boardLimits, brd02Pad } from "../../brd/board.js";
import { defineCheck } from "../../registry.js";
import { viewsOf } from "../../views.js";
import { skip } from "../common.js";

export const check = defineCheck<"feature", "pad">({
  id: "CHK-BRD-02", level: "feature",
  run: (t, ctx) => {
    const record = t.part.board;
    const at = { level: "feature" as const, part: t.part.id, feature: t.feature.id };
    if (record === undefined) return [skip(at, "not run", `${t.part.id} carries no board record`)];
    return brd02Pad(record, t.feature.id, boardLimits(ctx.profile), viewsOf(ctx).catalog);
  },
});
