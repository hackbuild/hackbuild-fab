// CHK-BRD-01: gerbers reparse to source geometry with an independent parser
// (M08-T07). The run body is packages/checks/src/brd/chk-brd-01.ts.

import { defineCheck } from "../../registry.js";
import { runBrd01 } from "../../brd/chk-brd-01.js";

export const check = defineCheck({ id: "CHK-BRD-01", level: "artifact", run: (t, ctx) => runBrd01(t, ctx) });
