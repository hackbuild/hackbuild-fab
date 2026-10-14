// CHK-NET-46, a seated board pin lands on its printed contact (K-04, the
// flagship MIDI pad 2026-10-13: an RP2040-Zero press seat could not end a
// read path, so four test leads ran to the body edge only so the solve had
// a terminal). The run body is packages/checks/src/net/net46.ts.

import { defineCheck } from "../../registry.js";
import { runNet46 } from "../../net/net46.js";

export const check = defineCheck({
  id: "CHK-NET-46",
  level: "net",
  run: (t, ctx) => runNet46(t, ctx),
});
