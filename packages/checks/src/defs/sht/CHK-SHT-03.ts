// CHK-SHT-03, the DXF reloads closed with an independent parser (OGEE R16
// sheets 2026-08: readers dropped the closed flag and reported every
// outline open; the M07 DXF inventory found every shipped emitter failing
// a rule). The kernel in src/sheet/chk-sht-03.ts reads the bytes the DXF
// exporter wrote for this sheet with its own group-code reader; legal is
// no rule failed. A sheet whose cut file the caller did not hand in is
// reported not run (D-153).

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { auditDxf, sht03Finding } from "../../sheet/chk-sht-03.js";
import { NO_SHEET_CUT, viewsOf } from "../../views.js";
import { skip } from "../common.js";

export const check = defineCheck({
  id: "CHK-SHT-03",
  level: "sheet",
  run: (t, ctx): readonly Finding[] => {
    const target = { level: "sheet", sheet: t.sheet.id } as const;
    const cut = viewsOf(ctx).sheetCut?.(t.sheet.id);
    if (cut === undefined) return [skip(target, "not run", NO_SHEET_CUT)];
    return [sht03Finding(target, cut.name, auditDxf(cut.dxf, cut.svg))];
  },
});
