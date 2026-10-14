// CHK-3MF-06, every component p:path resolves to a model part other than
// the root model, and the object id exists there (CASK 2026-09: a
// self-referential p:path never resolved; the object loaded with no
// volumes; empty plate, no error; CHECKS.md 7.2, D-068). The run body is
// the M-S skeleton one (skeleton/threemf.ts, M-S-T06).

import { defineCheck } from "../../registry.js";
import { run3mf06 } from "../../skeleton/threemf.js";

export const check = defineCheck({
  id: "CHK-3MF-06",
  level: "artifact",
  run: (t) => run3mf06(t),
});
