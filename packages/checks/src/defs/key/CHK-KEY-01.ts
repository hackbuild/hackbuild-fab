// CHK-KEY-01, flex cone contact gap at least 1.2 and 35 to 50 percent of
// cone height (PIP 2026-09: a pressed cone travels about half its height;
// knowledge/designs/pip.md 5.1). The run body and drivenBy are the M-S
// skeleton ones (skeleton/key01.ts, M-S-T06): 35 to 50 percent of the
// built cone height (profile key.flexGapFracMin and key.flexGapFracMax,
// D-241) with the floor read from profile key.flexGapFloor.

import { defineCheck } from "../../registry.js";
import { key01DrivenBy, runKey01 } from "../../skeleton/key01.js";

export const check = defineCheck<"feature", "contact">({
  id: "CHK-KEY-01",
  level: "feature",
  run: (t, ctx) => runKey01(t, ctx),
  drivenBy: key01DrivenBy,
});
