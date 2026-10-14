// CHK-SHT-02, ring count at least the declared hole count per part: every
// hole the build declares through the sheet is a hole ring of the cut
// profile (a hole that ran out through the outline or merged away is named).
// The kernel is packages/nest/src/connect.ts chkSht02 (M07-T04); this body
// reports its findings on the sheet (M07-T14).

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { sheetFindings } from "./connect.js";

export const check = defineCheck({
  id: "CHK-SHT-02",
  level: "sheet",
  run: (t, ctx): readonly Finding[] => sheetFindings("CHK-SHT-02", t.sheet.id, ctx, "no part on this sheet"),
});
