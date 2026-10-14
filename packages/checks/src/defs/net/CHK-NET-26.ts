// CHK-NET-26, apartExcept: removing the named part separates the terminals
// (FEELER 2026-08, the pot collector). The run body is
// packages/checks/src/net/net26.ts (M05-T19 step 2): the named nets join
// in the actuated state and fall apart once the cut body is removed.

import { defineCheck } from "../../registry.js";
import { runNet26 } from "../../net/net26.js";

export const check = defineCheck({
  id: "CHK-NET-26",
  level: "net",
  run: (t, ctx) => runNet26(t, ctx),
});
