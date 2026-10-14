// row-cycle-write-schedule: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origRowCycleWriteSchedule = refusedMechanism({
  id: "row-cycle-write-schedule",
  family: "intermittent",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "STIPPLE originals (M06-T14, D-222); CANONS.md 11.3: one clear pull, one cycle per row, synchronous latch commit",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/stipple/files/stipple-r17b.html doClear, writeRow, canLatch yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 (covers added) with reference joints/balance-beam",
  original: [
    { slug: "stipple", file: "files/stipple-r17b.html", fn: "doClear, writeRow, canLatch", sha256: "f4afad81c417627e84349c5f6cf6b1016e520083ce8ac631b7d71fc6c02f1767", record: "stipple RECORD.md" },
  ],
});
