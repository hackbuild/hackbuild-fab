// cap-well-lamination: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origCapWellLamination = refusedMechanism({
  id: "cap-well-lamination",
  family: "kerf",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "STIPPLE originals (M06-T14, D-222); CANONS.md 11.3: cap well of four laminations with the rim at R_LATCH",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/stipple/files/stipple-r17b.html face2, FACE2_N, R_LATCH yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T06 with reference joints/bridge",
  original: [
    { slug: "stipple", file: "files/stipple-r17b.html", fn: "face2, FACE2_N, R_LATCH", sha256: "f4afad81c417627e84349c5f6cf6b1016e520083ce8ac631b7d71fc6c02f1767", record: "stipple RECORD.md" },
  ],
});
