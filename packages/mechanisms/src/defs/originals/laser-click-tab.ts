// laser-click-tab: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origLaserClickTab = refusedMechanism({
  id: "laser-click-tab",
  family: "snap",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COTTER originals (M06-T14, D-222); CANONS.md 11.3: tongue between two barbed spring prongs with keyhole slit roots; strain at the barb per the corrected COTTER record; CANONS.md 8.3 row: laser click tab",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/cotter/files/cotter-src/src/modules.js lines 221 to 244 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: strain at the barb per the corrected cotter record; promotes at M11-T09 with reference joints/laser-click-tab",
  original: [
    { slug: "cotter", file: "files/cotter-src/src/modules.js", lines: "221 to 244", sha256: "3f40c1fda78fc2aa3dc305ee1db973bdf3c36088dd1a289431263501118009ad", record: "cotter RECORD.md" },
  ],
});
