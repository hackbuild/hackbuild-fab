// CHK-NET-12, unrouted connections and tight spots surface as warnings,
// never silently. The run body is packages/checks/src/net/net12.ts (M05-T10
// step 4): the route metrics of every routed part of the project and its
// net gaps. It needs the circuit kernel; circuit.solve runs it.

import { defineCheck } from "../../registry.js";
import { runNet12 } from "../../net/net12.js";

export const check = defineCheck({
  id: "CHK-NET-12",
  level: "project",
  run: (t, ctx) => runNet12(t, ctx),
});
