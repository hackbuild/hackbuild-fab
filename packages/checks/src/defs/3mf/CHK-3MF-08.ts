// CHK-3MF-08, no object that holds a conductor body or shares a face with
// one has interlocking_beam on, whether set per object or inherited from the
// project (research 2026-10, research/3dp-landscape.md section 11 idea 8;
// CHECKS.md 9.11; M05-T20). The run body is packages/checks/src/3mf/chk-3mf-08.ts.

import { defineCheck } from "../../registry.js";
import { run3mf08 } from "../../3mf/chk-3mf-08.js";

export const check = defineCheck({
  id: "CHK-3MF-08",
  level: "artifact",
  run: (t, ctx) => run3mf08(t, ctx),
});
