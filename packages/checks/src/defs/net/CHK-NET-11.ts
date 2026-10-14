// CHK-NET-11, trace layer built per net from one outline offset; post and
// via radii clear of half the trace width. The run body is
// packages/checks/src/net/net11.ts (M05-T10 step 4), over the emitted
// layer regions and posts in the Part IR.

import { defineCheck } from "../../registry.js";
import { runNet11 } from "../../net/net11.js";

export const check = defineCheck({
  id: "CHK-NET-11",
  level: "net",
  run: (t, ctx) => runNet11(t, ctx),
});
