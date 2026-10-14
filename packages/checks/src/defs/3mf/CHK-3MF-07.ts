// CHK-3MF-07, per-filament vectors one element per filament with the
// per-slot type; overhang_fan_threshold elements match ^[0-9]+%$ (CASK
// 2026-09: Flash Studio warned on the enum default; CHECKS.md 7.3, D-069,
// D-159). The run body is the M-S skeleton one (skeleton/threemf.ts,
// M-S-T06) over the harvested filament template.

import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { defineCheck } from "../../registry.js";
import { run3mf07 } from "../../skeleton/threemf.js";

export const check = defineCheck({
  id: "CHK-3MF-07",
  level: "artifact",
  run: (t, _ctx, src) => run3mf07(t, src.filamentTemplate ?? DEFAULT_TEMPLATE),
});
