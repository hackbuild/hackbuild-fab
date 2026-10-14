// CHK-UI-01, run body pending: a rendered bench page is produced from M09.
// The skip rule reports it until the milestone below lands the run
// (M04-T01 step 6); this module carries only that milestone.

import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-UI-01", level: "page", pending: "M09" });
