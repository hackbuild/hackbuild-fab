// round-thread-phase-referenced: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origRoundThreadPhaseReferenced = refusedMechanism({
  id: "round-thread-phase-referenced",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "SPARGER-W originals (M06-T14, D-222); CANONS.md 11.3: single-start eccentric round thread referenced to phase, with clearance, for a sealed bottle; CANONS.md 8.3 row: two-start thread break",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/sparger-w/files/source/sparger_r.py thread lines 115 to 124 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/round-thread",
  original: [
    { slug: "sparger-w", file: "files/source/sparger_r.py", fn: "thread", lines: "115 to 124", sha256: "8ac1cc90de33499fb454dfff12ee68b7180c69ca3385688d0d8d28fe8f4b24af", record: "sparger-w RECORD.md" },
  ],
});
