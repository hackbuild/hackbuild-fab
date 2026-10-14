// CHK-PRT-04, wall thickness is a whole multiple of line width (STYLUS
// 2026-08). The run body is the M-S skeleton one (skeleton/prt04.ts,
// M-S-T06): declared pocket walls against the preset's line width, walls
// over 2 x walls x line width skip as infill walls (D-198).

import { defineCheck } from "../../registry.js";
import { runPrt04 } from "../../skeleton/prt04.js";

export const check = defineCheck({
  id: "CHK-PRT-04",
  level: "part",
  run: (t, ctx) => runPrt04(t, ctx),
});
