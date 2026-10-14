// CHK-MOT-01, run body pending: joint limits over the programmed path need the motion kernel.
// The skip rule reports it until the milestone below lands the run
// (M04-T01 step 6); this module carries only that milestone.

import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-MOT-01", level: "assembly", pending: "M07" });
