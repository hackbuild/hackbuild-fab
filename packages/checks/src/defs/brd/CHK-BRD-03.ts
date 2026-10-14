// CHK-BRD-03: back-mounted asymmetric parts checked for chirality (M08-T12
// step 3). The target is the board as an assembly of its placed parts;
// the kernel is packages/checks/src/brd/board.ts brd03.

import { boardLimits, brd03 } from "../../brd/board.js";
import { defineCheck } from "../../registry.js";
import { viewsOf } from "../../views.js";
import { skip } from "../common.js";

export const check = defineCheck({
  id: "CHK-BRD-03", level: "assembly",
  run: (t, ctx) => {
    const at = { level: "assembly" as const, assembly: t.assembly.id };
    const boards = t.assembly.parts.filter((p) => p.board !== undefined);
    if (boards.length === 0) return [skip(at, "not run", `${t.assembly.id} holds no board part`)];
    const lim = boardLimits(ctx.profile);
    const out = boards.flatMap((p) => brd03(p.board!, lim, viewsOf(ctx).catalog));
    return out.length > 0 ? out : [skip(at, "not run", `${t.assembly.id} mounts no part on the back`)];
  },
});
