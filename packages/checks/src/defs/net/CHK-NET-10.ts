// CHK-NET-10, run body pending: port interface compatibility needs the circuit kernel.
// The skip rule reports it until the milestone below lands the run
// (M04-T01 step 6); this module carries only that milestone.

import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-NET-10", level: "feature", pending: "M05" });
