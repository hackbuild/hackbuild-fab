// CHK-3MF-01, Application tag starts with BambuStudio- or OrcaSlicer- (challenge-coin 2026-08: colours silently dropped).
// The rule runs once, in the M00 validator mirror (packages/3mf
// validate/rules.ts, CHECKS.md 6 and 7.3); this module reads its result on
// the exported bytes.

import { defineCheck } from "../../registry.js";
import { validatorFindings } from "./validator.js";

export const check = defineCheck({
  id: "CHK-3MF-01",
  level: "artifact",
  run: (t, _ctx, src) => validatorFindings(t, "CHK-3MF-01", src.filamentTemplate),
});
