// CHK-SHT-07, a crank hub is not severed by its bore plus a pin hole: a hole
// of diameter d at radius r keeps r - d/2 >= bore + w and r + d/2 <= outer - w,
// w the stock's minimum feature from the profile (knowledge/kernels/
// sheet-design.md, connectivity section). The kernel is
// packages/nest/src/connect.ts chkSht07 (M07-T04); this body reports its
// findings on the sheet (M07-T14). A sheet whose parts declare no hub with
// holes reports not run.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { sheetFindings } from "./connect.js";

export const check = defineCheck({
  id: "CHK-SHT-07",
  level: "sheet",
  run: (t, ctx): readonly Finding[] => sheetFindings("CHK-SHT-07", t.sheet.id, ctx, "no part on this sheet declares a hub with holes"),
});
