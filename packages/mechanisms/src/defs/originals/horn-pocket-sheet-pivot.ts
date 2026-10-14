// horn-pocket-sheet-pivot: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origHornPocketSheetPivot = refusedMechanism({
  id: "horn-pocket-sheet-pivot",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "JIB originals (M06-T14, D-222); CANONS.md 11.3: servo horn as the only bearing between laser sheet plates, engraved horn pockets",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/jib/files/jib.html lines 219 to 252 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/horn-pocket",
  original: [
    { slug: "jib", file: "files/jib.html", lines: "219 to 252", sha256: "fd968e5721bac20b7c72a4552275f26b48fdbb10ef122b01c92f4249c57cc331", record: "jib RECORD.md" },
  ],
});
