// CHK-NET-13, printed conductor slope under 45 deg; vertical runs warn (TCB,
// CHI 2021: vertical printed traces about 7x the resistance of flat ones,
// measured by the TCB authors). The run body is
// packages/checks/src/net/net13.ts (M05-T19 step 1): the steepest centreline
// segment of each conductor in print pose against the bed plane.

import { defineCheck } from "../../registry.js";
import { runNet13 } from "../../net/net13.js";

export const check = defineCheck<"feature", "conductor">({
  id: "CHK-NET-13",
  level: "feature",
  run: (t, ctx) => runNet13(t, ctx),
});
