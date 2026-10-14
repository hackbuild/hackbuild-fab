// CHK-NET-05, printed button reads LOW when pressed (BLOCKS 2026-08: the
// BOSS sim at 50 kohm and one 0.5 VIO threshold read 2.05 V as HIGH). The
// run body is packages/checks/src/net/net05.ts (M05-T06 step 3): the pullup
// interval of circuit/pullup-low-read over the pressed path circuit.solve
// extracted. It needs the circuit kernel; check.run under the M04 kernel
// set reports the skip rule's reason, and circuit.solve runs it.

import { defineCheck } from "../../registry.js";
import { runNet05 } from "../../net/net05.js";

export const check = defineCheck<"feature", "port">({
  id: "CHK-NET-05",
  level: "feature",
  run: (t, ctx) => runNet05(t, ctx),
});
