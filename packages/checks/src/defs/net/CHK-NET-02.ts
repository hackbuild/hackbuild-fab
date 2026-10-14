// CHK-NET-02, edge-level clearance, not vertex-level (TANG 2026-08: a
// triangle edge crossed an obstruction a vertex test missed). Two forms of
// one rule. With circuit.solve's extraction (M05-T10) it reads the solid
// gaps between built nets (net/net02.ts), against profile
// stack.netToNetMin. Without one it runs the M-S skeleton body
// (skeleton/net02.ts, M-S-T06): segment to segment distance between
// declared conductor footprints. Under the M04 kernel set no producer
// emits net targets and the skip rule reports it.

import { defineCheck } from "../../registry.js";
import { runNet02 } from "../../skeleton/net02.js";
import { runNet02Solid } from "../../net/net02.js";
import { viewsOf } from "../../views.js";

export const check = defineCheck({
  id: "CHK-NET-02",
  level: "net",
  run: (t, ctx) => {
    const ex = viewsOf(ctx).extraction?.(t.part.id);
    return ex === undefined ? runNet02(t) : runNet02Solid(t, ctx, ex);
  },
});
