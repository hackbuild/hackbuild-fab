// CHK-NET-06, ADC source impedance under about 100 kohm or flagged (TANG R5
// 2026-08-17). The run body is packages/checks/src/net/net06.ts (M05-T06
// step 4): the adc read model's band on the net's series resistance, read
// through circuit.solve. It needs the circuit kernel and net targets.

import { defineCheck } from "../../registry.js";
import { runNet06 } from "../../net/net06.js";

export const check = defineCheck({
  id: "CHK-NET-06",
  level: "net",
  run: (t, ctx) => runNet06(t, ctx),
});
