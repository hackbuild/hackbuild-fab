// cup-on-boss-journal: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origCupOnBossJournal = refusedMechanism({
  id: "cup-on-boss-journal",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "DAVIT originals (M06-T14, D-222); CANONS.md 11.3: axial journal as a cup on a boss with self-sized stadium voids",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/davit/files/src/parts_r4.py lines 91 to 119 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/horn-capture",
  original: [
    { slug: "davit", file: "files/src/parts_r4.py", lines: "91 to 119", sha256: "ddae2111221fb45608190cedf31cc9b05cd916fce12fd8afd11ab812da885a36", record: "davit RECORD.md" },
  ],
});
