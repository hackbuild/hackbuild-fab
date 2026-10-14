// CHK-BRD-19: lead landing through an independently derived transform
// (M08-T09 step 2; the card's provisional CHK-BRD-08). The run body is
// packages/checks/src/brd/chk-brd-19.ts.

import { defineCheck } from "../../registry.js";
import { runBrd19 } from "../../brd/chk-brd-19.js";

export const check = defineCheck({ id: "CHK-BRD-19", level: "assembly", run: (t, ctx) => runBrd19(t, ctx) });
