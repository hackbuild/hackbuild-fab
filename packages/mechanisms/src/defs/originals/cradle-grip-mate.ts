// cradle-grip-mate: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedMechanism } from "../../def.js";

export const origCradleGripMate = refusedMechanism({
  id: "cradle-grip-mate",
  family: "joint",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "DERRICK originals (M06-T14, D-222); CANONS.md 11.3: cheeks on flank lands, rib in groove, detent bump, one stop screw; two mates (axis turn and antiparallel) compose an arm",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/derrick/files/src/arm_parts.py lines 90 to 116 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M11-T09 with reference joints/cradle-mate",
  original: [
    { slug: "derrick", file: "files/src/arm_parts.py", lines: "90 to 116", sha256: "ab2e4acd8283f43b78d64a9bc653afe4b79fd1de5c993a5cf3ff2a7d30821fc3", record: "derrick RECORD.md" },
    { slug: "derrick", file: "files/src/arm_build.py", lines: "27 to 55", sha256: "204cc173ccaba951a7b690cb029b2ba3a9dcf3600516098bd0e0dee0e623e467", record: "derrick RECORD.md" },
  ],
});
