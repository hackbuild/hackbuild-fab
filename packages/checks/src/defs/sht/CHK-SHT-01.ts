// CHK-SHT-01, every profile is one connected piece; nest refuses otherwise
// (OGEE R12 2026-08: column channels ran edge to edge and cut a deck into
// strips). The kernel is packages/nest/src/connect.ts chkSht01, run on each
// part's compensated profile before anything is placed (M07-T04); this body
// reports its findings on the sheet (M07-T14). Legal is one piece; the
// count of pieces travels in extra.pieces.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { sheetFindings } from "./connect.js";

export const check = defineCheck({
  id: "CHK-SHT-01",
  level: "sheet",
  run: (t, ctx): readonly Finding[] => sheetFindings("CHK-SHT-01", t.sheet.id, ctx, "no part on this sheet"),
});
