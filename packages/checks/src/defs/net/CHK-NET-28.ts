// CHK-NET-28, capacitive electrode path at most the Capricate ceiling
// (Capricate, UIST 2015: the SNR fell under 5:1 above 30 kohm; entered by
// M04-T12). The run body is packages/checks/src/net/capacitive-ceiling.ts
// (M05-T12): circuit/capacitive-path-ceiling on the net's path, read
// through circuit.solve. It needs the circuit kernel and net targets.

import { defineCheck } from "../../registry.js";
import { runNet28 } from "../../net/capacitive-ceiling.js";

export const check = defineCheck({
  id: "CHK-NET-28",
  level: "net",
  run: (t, ctx) => runNet28(t, ctx),
});
