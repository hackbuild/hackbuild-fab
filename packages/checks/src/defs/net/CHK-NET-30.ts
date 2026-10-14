// CHK-NET-30, printed track swing (BAFFLE R3 2026-09-14: the model's own 30
// percent swing check; TANG R6 cPLA arc read 6.9 percent). The run body is
// packages/checks/src/net/net30.ts (M05-T19 step 8).

import { defineCheck } from "../../registry.js";
import { runNet30 } from "../../net/net30.js";

export const check = defineCheck({
  id: "CHK-NET-30",
  level: "net",
  run: (t, ctx) => runNet30(t, ctx),
});
