// CHK-3MF-03, no printer or process scoped keys; preset names only (STYLUS 2026-08: layer_height in project_settings crashed Flash Studio).
// The rule runs once, in the M00 validator mirror (packages/3mf
// validate/rules.ts, CHECKS.md 6 and 7.3); this module reads its result on
// the exported bytes.

import { defineCheck } from "../../registry.js";
import { validatorFindings } from "./validator.js";

export const check = defineCheck({
  id: "CHK-3MF-03",
  level: "artifact",
  run: (t, _ctx, src) => validatorFindings(t, "CHK-3MF-03", src.filamentTemplate),
});
