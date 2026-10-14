// CHK-MOT-03, run body pending: sim and firmware rule tables need the motion kernel.
// The skip rule reports it until the milestone below lands the run
// (M04-T01 step 6); this module carries only that milestone.

import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-MOT-03", level: "source", pending: "M07" });
