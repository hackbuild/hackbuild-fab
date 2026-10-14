// CHK-3MF-02, every per-filament key exactly N long (COLLAR v4 2026-08: the filament list collapsed to one).
// The rule runs once, in the M00 validator mirror (packages/3mf
// validate/rules.ts, CHECKS.md 6 and 7.3); this module reads its result on
// the exported bytes.

import { defineCheck } from "../../registry.js";
import { validatorFindings } from "./validator.js";

export const check = defineCheck({
  id: "CHK-3MF-02",
  level: "artifact",
  run: (t, _ctx, src) => validatorFindings(t, "CHK-3MF-02", src.filamentTemplate),
});
