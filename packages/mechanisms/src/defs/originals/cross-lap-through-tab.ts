// cross-lap-through-tab: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origCrossLapThroughTab = refusedMechanism({
  id: "cross-lap-through-tab",
  family: "kerf",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SKETCH originals (M06-T14, D-222); CANONS.md 11.3: cross lap and proud through-tab joints written once per edge; reconcile fingerCells (2n - 1 cells) with finger-joint's L/(2n+1)",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/sketch/files/sketch.html fingerCells lines 595 to 649 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: its fingerCells 2n-1 rule is reconciled with finger-joint L/(2n+1) in the derive test, both rules recorded; promotes at M11-T09 (covers added to the M06-T06 reference) with reference joints/finger",
  original: [
    { slug: "sketch", file: "files/sketch.html", fn: "fingerCells", lines: "595 to 649", sha256: "39b5ebce5ce14ac50233f16f3875e5bbcf32136c8ba47fb1e28558243b8a98d5", record: "sketch RECORD.md" },
  ],
});
