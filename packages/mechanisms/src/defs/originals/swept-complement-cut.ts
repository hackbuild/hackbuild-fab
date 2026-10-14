// swept-complement-cut: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origSweptComplementCut = refusedMechanism({
  id: "swept-complement-cut",
  family: "intermittent",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "KNURL originals (M06-T14, D-222); CANONS.md 11.3: lock ring cut as the swept complement of the star through the drive window; lands the backlog sweepcut kind",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/knurl/files/knurl.html lines 588 to 600 yet, and the original's own numbers are recorded in test/legacy/swept-complement-cut.json; promotes at M10-T08 with reference mechanisms/geneva-3",
  original: [
    { slug: "knurl", file: "files/knurl.html", lines: "588 to 600", sha256: "90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1", record: "knurl RECORD.md" },
  ],
});
