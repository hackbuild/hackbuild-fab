// CHK-NET-08, run body pending: copper to cut outline reads a nested sheet, which M07 produces.
// The skip rule reports it until the milestone below lands the run
// (M04-T01 step 6); this module carries only that milestone.

import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-NET-08", level: "sheet", pending: "M07" });
