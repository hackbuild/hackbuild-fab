// CHK-NET-01, single island per net. The run body is
// packages/checks/src/net/net01.ts (M05-T10 step 4): the pieces of
// circuit.solve's extraction (M05-T04). It needs the circuit kernel and net
// targets; check.run under the M04 kernel set reports the skip rule's
// reason, and circuit.solve runs it on a routed part.

import { defineCheck } from "../../registry.js";
import { runNet01 } from "../../net/net01.js";

export const check = defineCheck({
  id: "CHK-NET-01",
  level: "net",
  run: (t, ctx) => runNet01(t, ctx),
});
