// CHK-FIT-07, a printed conductive socket on a printed stud (BAFFLE R3
// 2026-09-18: the tile socket got collet slots only after the first tile
// print). The run body is packages/checks/src/fit/fit07.ts (M05-T19 step 8).

import { defineCheck } from "../../registry.js";
import { runFit07 } from "../../fit/fit07.js";

export const check = defineCheck({
  id: "CHK-FIT-07",
  level: "feature",
  run: (t, ctx) => runFit07(t, ctx),
});
