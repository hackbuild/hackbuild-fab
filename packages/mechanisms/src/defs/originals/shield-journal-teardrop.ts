// shield-journal-teardrop: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origShieldJournalTeardrop = refusedMechanism({
  id: "shield-journal-teardrop",
  family: "construction",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "DETENT, DAVIT originals (M06-T14, D-222); CANONS.md 11.3: printable horizontal bores: teardrop and shield profiles with the peak toward world +Z",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/detent/files/revD/detent_parts.py wcut, teardrop, gable lines 223 to 269 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/horn-capture",
  original: [
    { slug: "detent", file: "files/revD/detent_parts.py", fn: "wcut, teardrop, gable", lines: "223 to 269", sha256: "e72c2e26019f62122436ae1802fdce6c8ca08de74fd979e5327b0dbece3943d7", record: "detent RECORD.md" },
    { slug: "davit", file: "files/src/lib.py", lines: "49 to 81", sha256: "33d8ebe0f4aa6bcf36ea4ab678d1f0e0bb4a3a5233abced76fc905b931b5057a", record: "davit RECORD.md" },
  ],
});
