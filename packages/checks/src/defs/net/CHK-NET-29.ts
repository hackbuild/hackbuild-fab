// CHK-NET-29, charge-release path settles inside the wait: pathOhm at most
// rejectOhm (PIP 2026-09: a computed settle of 78 us passed a 200 us wait
// while the printed keys crossed at 113 to 2431 us, measured by the owner).
// The run body is packages/checks/src/net/net29.ts (M05-T19 step 4): the
// read record circuit.solve hands in through views.circuit, else the one
// read from the net. It needs the circuit kernel; under the M04 kernel set
// the skip rule reports it, and the skeleton set runs the same body.

import { defineCheck } from "../../registry.js";
import { runNet29 } from "../../net/net29.js";

export const check = defineCheck({
  id: "CHK-NET-29",
  level: "net",
  run: (t, ctx) => runNet29(t, ctx),
});
