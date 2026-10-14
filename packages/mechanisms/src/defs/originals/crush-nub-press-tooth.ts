// crush-nub-press-tooth: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origCrushNubPressTooth = refusedMechanism({
  id: "crush-nub-press-tooth",
  family: "kerf",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "COTTER originals (M06-T14, D-222); CANONS.md 11.3: laser press tooth with crush nubs and a lead-in, tab +1 kerf, slot -1 kerf; CANONS.md 8.3 row: crush-nub press tooth",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/cotter/files/cotter-src/src/modules.js lines 221 to 244 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/crush-nub-tooth",
  original: [
    { slug: "cotter", file: "files/cotter-src/src/modules.js", lines: "221 to 244", sha256: "3f40c1fda78fc2aa3dc305ee1db973bdf3c36088dd1a289431263501118009ad", record: "cotter RECORD.md" },
    { slug: "cotter", file: "files/cotter-src/test/laser_fit.mjs", sha256: "ea39bc46f5fc31d229c451ae213cdc2524ad0ea0d0f593b893daaed8e7880bec", record: "cotter RECORD.md" },
  ],
});
