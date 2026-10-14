// CHK-NET-27, makesContact executed by the actuated move and a touch test
// (FEELER 2026-08: makesContact was recorded and never tested on geometry,
// so the wiper bug went through). The run body is
// packages/checks/src/net/net27.ts (M05-T19 step 3).

import { defineCheck } from "../../registry.js";
import { runNet27 } from "../../net/net27.js";

export const check = defineCheck<"feature", "contact">({
  id: "CHK-NET-27",
  level: "feature",
  run: (t, ctx) => runNet27(t, ctx),
});
