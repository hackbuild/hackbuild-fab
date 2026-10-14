// layout-solver-groups: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origLayoutSolverGroups = refusedArchetype({
  id: "layout-solver-groups",
  family: "design-rule",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "PIP originals (M06-T14, D-222); CANONS.md 11.3: fixed button groups, click-slot orientation search, edge and collision checks, one GPIO per net",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pip/files/haft-src/src/layout.js layout() lines 163 to 451 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T13 with reference layouts/pip-groups",
  original: [
    { slug: "pip", file: "files/haft-src/src/layout.js", fn: "layout()", lines: "163 to 451", sha256: "2d1c6c10554b5c7d8dc333496529abee82e937d2d3fe85c41a8d7ee22bb2468c", record: "pip RECORD.md" },
  ],
});
