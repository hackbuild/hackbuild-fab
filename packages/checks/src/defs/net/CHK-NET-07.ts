// CHK-NET-07, run body pending: copper under a module body reads copper nets, which M05 produces.
// The skip rule reports it until the milestone below lands the run
// (M04-T01 step 6); this module carries only that milestone.

import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-NET-07", level: "net", pending: "M05" });
